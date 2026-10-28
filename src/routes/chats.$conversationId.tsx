import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type Profile } from "@/hooks/useAuth";
import { t } from "@/lib/i18n";
import { Phone, MoreVertical, Paperclip, Mic, Square, Pencil, Trash2, X } from "lucide-react";

export const Route = createFileRoute("/chats/$conversationId")({ component: Conversation });

type Message = { id: string; sender_id: string; body: string | null; audio_path: string | null; created_at: string; is_edited?: boolean; };

function dayKey(iso: string): string { const d = new Date(iso); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; }
function formatDialogDate(iso: string): string {
  const d = new Date(iso); const now = new Date();
  const diffDays = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 86400000);
  if (diffDays === 0) return "Сегодня"; if (diffDays === 1) return "Вчера";
  return d.toLocaleDateString("ru", { day: "numeric", month: "long" });
}

function VoiceBubble({ path, mine }: { path: string; mine: boolean }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { supabase.storage.from("voice").createSignedUrl(path, 3600).then(({ data }) => setUrl(data?.signedUrl ?? null)); }, [path]);
  return url ? <audio controls src={url} className={`h-10 w-full max-w-[200px] ${mine ? "opacity-90" : ""}`} /> : <span>…</span>;
}

function Conversation() {
  const { conversationId } = Route.useParams();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [other, setOther] = useState<Profile | null>(null);
  const [myLang, setMyLang] = useState<string>("ru");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [customName, setCustomName] = useState<string | null>(null);

  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const [recording, setRecording] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const tr = t(myLang);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: convo } = await supabase.from("conversations").select("user_a, user_b").eq("id", conversationId).maybeSingle();
      if (!convo) return;
      const otherId = convo.user_a === user.id ? convo.user_b : convo.user_a;

      const { data: profiles } = await supabase.from("profiles").select("id, user_number, preferred_language").in("id", [otherId, user.id]);
      const rows = (profiles ?? []) as Profile[];
      setOther(rows.find((p) => p.id === otherId) ?? null);
      if (rows.find((p) => p.id === user.id)) setMyLang(rows.find((p) => p.id === user.id)!.preferred_language);

      const { data: aliasData } = await supabase.from("contact_aliases").select("alias").eq("owner_id", user.id).eq("contact_id", otherId).maybeSingle();
      if (aliasData) setCustomName(aliasData.alias);
      
      const { data: msgs } = await supabase.from("messages").select("*").eq("conversation_id", conversationId).order("created_at", { ascending: true });
      setMessages((msgs ?? []) as Message[]);

      await supabase.from("messages").update({ is_read: true }).eq("conversation_id", conversationId).neq("sender_id", user.id).eq("is_read", false);
    })();
  }, [conversationId, user]);

  useEffect(() => {
    const channel = supabase.channel(`messages-${conversationId}`).on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, (payload) => {
      if (payload.eventType === 'INSERT') setMessages((prev) => [...prev, payload.new as Message]);
      if (payload.eventType === 'UPDATE') setMessages((prev) => prev.map(m => m.id === (payload.new as Message).id ? payload.new as Message : m));
      if (payload.eventType === 'DELETE') setMessages((prev) => prev.filter(m => m.id !== (payload.old as Message).id));
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  const startPress = (id: string, mine: boolean) => {
    if (!mine) return;
    longPressTimer.current = setTimeout(() => { setActiveMenuId(id); if (window.navigator?.vibrate) window.navigator.vibrate(50); }, 500);
  };
  const endPress = () => { if (longPressTimer.current) clearTimeout(longPressTimer.current); };

  async function send(e: React.FormEvent) {
    e.preventDefault(); const body = text.trim(); if (!body || !user || sending) return;
    setSending(true); setText("");
    const { data } = await supabase.from("messages").insert({ conversation_id: conversationId, sender_id: user.id, body }).select("*").single();
    if (data) setMessages((prev) => [...prev, data as Message]);
    setSending(false);
  }

  async function executeDelete() {
    if (!deleteConfirmId) return;
    const id = deleteConfirmId; setDeleteConfirmId(null);
    const { error } = await supabase.from("messages").delete().eq("id", id);
    if (!error) setMessages((prev) => prev.filter(m => m.id !== id));
  }

  async function handleSaveEdit() {
    if (!editText.trim() || !editingId) return;
    const newBody = editText.trim(); const id = editingId;
    const { error } = await supabase.from("messages").update({ body: newBody, is_edited: true }).eq("id", id);
    if (!error) { setEditingId(null); setMessages(prev => prev.map(m => m.id === id ? { ...m, body: newBody, is_edited: true } : m)); }
  }

  async function toggleRecord() {
    if (recording) { recorderRef.current?.stop(); setRecording(false); return; }
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream); const chunks: Blob[] = [];
      rec.ondataavailable = (ev) => ev.data.size && chunks.push(ev.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((tk) => tk.stop());
        if (!user || chunks.length === 0) return;
        const blob = new Blob(chunks, { type: "audio/webm" });
        const path = `${conversationId}/${crypto.randomUUID()}.webm`;
        await supabase.storage.from("voice").upload(path, blob, { contentType: "audio/webm" });
        const { data } = await supabase.from("messages").insert({ conversation_id: conversationId, sender_id: user.id, audio_path: path }).select("*").single();
        if (data) setMessages(prev => [...prev, data as Message]);
      };
      recorderRef.current = rec; rec.start(); setRecording(true);
    } catch { setMicError("Нет доступа к микрофону"); }
  }

  return (
    <main className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[#0a0a0a]">
      
      {/* Диагональный перелив */}
      <style>{`
        @keyframes chat-bg-sweep {
          0% { background-position: 200% 0; }
          8% { background-position: -200% 0; }
          100% { background-position: -200% 0; }
        }
        .animate-chat-sweep {
          background: linear-gradient(135deg, transparent 0%, rgba(124, 58, 237, 0.15) 50%, transparent 100%);
          background-size: 200% 100%;
          animation: chat-bg-sweep 60s linear infinite;
        }
      `}</style>
      <div className="animate-chat-sweep pointer-events-none absolute inset-0 z-0 opacity-60" />

      {activeMenuId && <div className="fixed inset-0 z-40" onClick={() => setActiveMenuId(null)} />}

      {/* Шапка */}
      <div className="relative z-10 flex w-full shrink-0 items-center gap-3 border-b border-zinc-800/50 bg-[#0a0a0a]/95 px-4 py-3 backdrop-blur">
        <Link to="/chats" className="rounded-full bg-zinc-800/50 px-3 py-1.5 text-xs text-zinc-300 shrink-0">Назад</Link>
        <span className="flex-1 truncate text-base font-semibold text-white">{customName ?? other?.user_number ?? "..."}</span>
      </div>

      {/* Сообщения */}
      <div className="relative z-10 min-h-0 w-full flex-1 space-y-3 overflow-y-auto overflow-x-hidden px-4 py-4">
        {messages.map((m, index) => {
          const mine = m.sender_id === user?.id;
          const prev = index > 0 ? messages[index - 1] : null;
          const showDate = !prev || dayKey(prev.created_at) !== dayKey(m.created_at);

          return (
            <div key={m.id} className="w-full">
              {showDate && <div className="my-4 text-center"><span className="rounded-full bg-zinc-800 px-3 py-1 text-[11px] text-zinc-400">{formatDialogDate(m.created_at)}</span></div>}

              <div className={`flex w-full ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  onTouchStart={() => startPress(m.id, mine)}
                  onTouchEnd={endPress}
                  onMouseDown={() => startPress(m.id, mine)}
                  onMouseUp={endPress}
                  className={`relative max-w-[85%] break-words select-none rounded-3xl px-4 py-2.5 text-[15px] ${mine ? "bg-gradient-to-tr from-[#7c3aed] to-[#a855f7] text-white rounded-br-sm" : "bg-[#1f1f22] text-zinc-100 rounded-bl-sm"}`}
                >
                  {/* Меню действий */}
                  {activeMenuId === m.id && (
                    <div className="absolute right-0 top-full mt-1 z-50 w-32 rounded-xl border border-zinc-700 bg-zinc-800 p-1 shadow-xl">
                      {m.body && <button onClick={() => { setEditingId(m.id); setEditText(m.body || ""); setActiveMenuId(null); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-white hover:bg-zinc-700"><Pencil className="h-3 w-3" /> Изменить</button>}
                      <button onClick={() => { setDeleteConfirmId(m.id); setActiveMenuId(null); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-red-400 hover:bg-zinc-700"><Trash2 className="h-3 w-3" /> Удалить</button>
                    </div>
                  )}

                  {/* Режим редактирования или отображение */}
                  {editingId === m.id ? (
                    <div className="flex flex-col gap-2 w-full min-w-[150px]">
                      <input autoFocus value={editText} onChange={(e) => setEditText(e.target.value)} className="w-full rounded-md bg-black/20 px-2 py-1 text-white outline-none" />
                      <div className="flex justify-end gap-2 text-xs">
                        <button onClick={() => setEditingId(null)} className="text-zinc-300"><X className="h-4 w-4"/></button>
                        <button onClick={handleSaveEdit} className="text-green-400 font-bold">ОК</button>
                      </div>
                    </div>
                  ) : m.audio_path ? <VoiceBubble path={m.audio_path} mine={mine} /> : <p className="whitespace-pre-wrap">{m.body}</p>}

                  <div className="mt-1 flex items-center justify-end gap-1">
                    {m.is_edited && <span className="text-[9px] opacity-70 italic mr-1">изм.</span>}
                    <p className="text-[10px] opacity-70">{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} className="h-2" />
      </div>

      {/* Панель ввода */}
      <div className="relative z-10 w-full shrink-0 border-t border-zinc-800/50 bg-[#0a0a0a] px-2 py-3 pb-safe">
        {micError && <p className="mb-2 px-2 text-xs text-red-500">{micError}</p>}
        <form onSubmit={send} className="flex w-full items-center gap-1.5">
          <button type="button" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-purple-400 hover:bg-zinc-800/50"><Paperclip className="h-5 w-5" /></button>

          <input disabled={recording} value={text} onChange={(e) => setText(e.target.value)} placeholder="Сообщение..." className="min-w-0 flex-1 rounded-full bg-[#18181b] px-4 py-2.5 text-[15px] text-white outline-none" />

          <button type="button" onClick={toggleRecord} className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${recording ? "bg-red-500/20 text-red-500 animate-pulse" : "text-purple-400 hover:bg-zinc-800/50"}`}>
            {recording ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-5 w-5" />}
          </button>

          <button type="submit" disabled={sending || !text.trim() || recording} className="flex h-10 shrink-0 items-center justify-center rounded-full bg-[#7c3aed] px-4 text-sm font-semibold text-white disabled:opacity-50">
            {tr.send}
          </button>
        </form>
      </div>

      {/* Окно удаления */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-3xl bg-[#1f1f22] p-6 shadow-2xl">
            <h3 className="mb-2 text-lg text-white font-semibold">Удалить сообщение?</h3>
            <p className="mb-6 text-sm text-zinc-400">Это действие нельзя отменить.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirmId(null)} className="text-zinc-300">Отмена</button>
              <button onClick={executeDelete} className="bg-red-500 text-white px-4 py-2 rounded-xl">Удалить</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}