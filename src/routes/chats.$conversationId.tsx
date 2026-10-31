import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type Profile } from "@/hooks/useAuth";
import { t } from "@/lib/i18n";
import { useCall } from "@/lib/call";
import { Phone, Paperclip, Mic, Square, Pencil, Trash2, X, Navigation } from "lucide-react";

export const Route = createFileRoute("/chats/$conversationId")({ component: Conversation });

type Message = { 
  id: string; 
  sender_id: string; 
  body: string | null; 
  audio_path: string | null; 
  image_path: string | null; 
  created_at: string; 
  is_edited?: boolean; 
};

function dayKey(iso: string): string { const d = new Date(iso); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; }
function formatDialogDate(iso: string): string { return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }

function ImageBubble({ path }: { path: string }) {
  const { data } = supabase.storage.from("voice").getPublicUrl(path);
  return <img src={data.publicUrl} alt="Файл" className="max-w-[220px] rounded-lg" />;
}

function VoiceBubble({ path, mine }: { path: string; mine: boolean }) {
  const { data } = supabase.storage.from("voice").getPublicUrl(path);
  return <audio controls src={data.publicUrl} className={`h-10 w-full max-w-[200px] ${mine ? "opacity-90" : ""}`} />;
}

function Conversation() {
  const { conversationId } = Route.useParams();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [other, setOther] = useState<Profile | null>(null);
  const [myLang, setMyLang] = useState<string>("ru");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  const [recording, setRecording] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const tr = t(myLang);
  const call = useCall();

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
      
      const { data: msgs } = await supabase.from("messages").select("*").eq("conversation_id", conversationId).order("created_at", { ascending: true });
      setMessages((msgs ?? []) as Message[]);
      
      // Отмечаем прочитанными
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

  // Логика долгого нажатия
  const handlePointerDown = (e: React.PointerEvent, id: string, mine: boolean) => {
    if (!mine) return;
    longPressTimer.current = setTimeout(() => {
      setActiveMenuId(id);
      if (window.navigator?.vibrate) window.navigator.vibrate(50);
    }, 500);
  };
  const handlePointerUp = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    // Если пользователь двигает пальцем (скроллит) - отменяем нажатие
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // Отправка текста
  async function send(e: React.FormEvent) {
    e.preventDefault(); const body = text.trim(); if (!body || !user || sending) return;
    setSending(true); setText("");
    await supabase.from("messages").insert({ conversation_id: conversationId, sender_id: user.id, body });
    setSending(false);
  }

  // Отправка файла (фото)
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setSending(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${conversationId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("voice").upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      await supabase.from("messages").insert({ conversation_id: conversationId, sender_id: user.id, image_path: path });
    } catch (err: any) {
      alert("Ошибка загрузки файла: " + err.message);
    } finally {
      setSending(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // Удаление
  async function executeDelete() {
    if (!deleteConfirmId) return;
    const id = deleteConfirmId; setDeleteConfirmId(null);
    await supabase.from("messages").delete().eq("id", id);
  }

  // Редактирование
  async function handleSaveEdit() {
    if (!editText.trim() || !editingId) return;
    const newBody = editText.trim(); const id = editingId;
    await supabase.from("messages").update({ body: newBody, is_edited: true }).eq("id", id);
    setEditingId(null);
  }

  // Запись голоса
  async function toggleRecord() {
    if (recording) { recorderRef.current?.stop(); setRecording(false); return; }
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream); const chunks: Blob[] = [];
      rec.ondataavailable = (ev) => { if (ev.data.size > 0) chunks.push(ev.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach((tk) => tk.stop());
        if (!user || chunks.length === 0) return;
        const blob = new Blob(chunks, { type: "audio/webm" });
        const path = `${conversationId}/${crypto.randomUUID()}.webm`;
        await supabase.storage.from("voice").upload(path, blob, { contentType: "audio/webm" });
        await supabase.from("messages").insert({ conversation_id: conversationId, sender_id: user.id, audio_path: path });
      };
      recorderRef.current = rec; rec.start(); setRecording(true);
    } catch (err: any) {
      setMicError("Доступ к микрофону запрещен или ошибка записи.");
    }
  }

  return (
    <main className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[#0a0a0a]">
      <style>{`
        @keyframes chat-bg-sweep { 0% { background-position: 200% 0; } 8% { background-position: -200% 0; } 100% { background-position: -200% 0; } }
        .animate-chat-sweep { background: linear-gradient(135deg, transparent 0%, rgba(124, 58, 237, 0.15) 50%, transparent 100%); background-size: 200% 100%; animation: chat-bg-sweep 60s linear infinite; }
        @keyframes twinkle { 0%, 100% { opacity: 0.1; } 50% { opacity: 0.7; } }
        .twinkle-bg { background-image: radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px); background-size: 60px 60px; animation: twinkle 4s ease-in-out infinite; }
        @keyframes shooting-star { 0% { transform: translate(100vw, -100vh) rotate(-45deg); opacity: 1; } 5% { transform: translate(-100vw, 100vh) rotate(-45deg); opacity: 1; } 5.1% { opacity: 0; } 100% { transform: translate(-100vw, 100vh) rotate(-45deg); opacity: 0; } }
        .shooting-star { position: absolute; top: 0; right: 0; width: 150px; height: 2px; background: linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,1)); filter: drop-shadow(0 0 6px rgba(255,255,255,0.9)); animation: shooting-star 15s linear infinite; pointer-events: none; }
      `}</style>

      <div className="animate-chat-sweep pointer-events-none absolute inset-0 z-0 opacity-60" />
      <div className="twinkle-bg pointer-events-none absolute inset-0 z-0 opacity-40" />
      <div className="shooting-star z-0" />

      {activeMenuId && <div className="fixed inset-0 z-40" onClick={() => setActiveMenuId(null)} />}

      {/* Шапка чата с кнопкой звонка */}
      <div className="relative z-10 flex w-full shrink-0 items-center gap-3 border-b border-zinc-800/50 bg-[#0a0a0a]/95 px-4 py-3 backdrop-blur">
        <Link to="/chats" className="rounded-full bg-zinc-800/50 px-3 py-1.5 text-xs text-zinc-300 shrink-0">Назад</Link>
        <span className="flex-1 truncate text-base font-semibold text-white">{other?.user_number ?? "..."}</span>
        {other && (
          <button type="button" disabled={call.busy} onClick={() => call.startCall(other.id, other.user_number)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-800/50 text-purple-400 transition-colors hover:bg-zinc-800 disabled:opacity-50">
            <Phone className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Сообщения */}
      <div className="relative z-10 min-h-0 w-full flex-1 space-y-3 overflow-y-auto overflow-x-hidden px-4 py-4">
        {messages.map((m, index) => {
          const mine = m.sender_id === user?.id;
          const prev = index > 0 ? messages[index - 1] : null;
          const showDate = !prev || dayKey(prev.created_at) !== dayKey(m.created_at);
          
          return (
            <div key={m.id} className="w-full">
              {showDate && <div className="my-4 text-center"><span className="rounded-full bg-zinc-800 px-3 py-1 text-[11px] text-zinc-400">{new Date(m.created_at).toLocaleDateString("ru")}</span></div>}
              
              <div className={`flex w-full ${mine ? "justify-end" : "justify-start"}`}>
                <div 
                  onPointerDown={(e) => handlePointerDown(e, m.id, mine)}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                  onPointerMove={handlePointerMove}
                  className={`relative max-w-[85%] break-words select-none rounded-3xl px-4 py-2.5 text-[15px] shadow-lg ${mine ? "bg-gradient-to-tr from-[#7c3aed] to-[#a855f7] text-white rounded-br-sm" : "bg-[#1f1f22] text-zinc-100 rounded-bl-sm border border-zinc-800/50"}`}
                >
                  {activeMenuId === m.id && (
                    <div className="absolute right-0 top-full mt-1 z-50 w-32 rounded-xl border border-zinc-700 bg-zinc-800 p-1 shadow-xl">
                      {m.body && <button onClick={() => { setEditingId(m.id); setEditText(m.body || ""); setActiveMenuId(null); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-white hover:bg-zinc-700"><Pencil className="h-3 w-3" /> Изменить</button>}
                      <button onClick={() => { setDeleteConfirmId(m.id); setActiveMenuId(null); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-red-400 hover:bg-zinc-700"><Trash2 className="h-3 w-3" /> Удалить</button>
                    </div>
                  )}

                  {editingId === m.id ? (
                    <div className="flex flex-col gap-2 w-full min-w-[150px]">
                      <input autoFocus value={editText} onChange={(e) => setEditText(e.target.value)} className="w-full rounded-md bg-black/20 px-2 py-1 text-white outline-none" />
                      <div className="flex justify-end gap-2 text-xs">
                        <button onClick={() => setEditingId(null)} className="text-zinc-300"><X className="h-4 w-4"/></button>
                        <button onClick={handleSaveEdit} className="text-green-400 font-bold">ОК</button>
                      </div>
                    </div>
                  ) : m.audio_path ? (
                    <VoiceBubble path={m.audio_path} mine={mine} />
                  ) : m.image_path ? (
                    <ImageBubble path={m.image_path} />
                  ) : (
                    <p className="whitespace-pre-wrap">{m.body}</p>
                  )}
                  
                  <div className="mt-1 flex items-center justify-end gap-1">
                    {m.is_edited && <span className="text-[9px] opacity-70 italic mr-1">изм.</span>}
                    <p className="text-[10px] opacity-70">{formatDialogDate(m.created_at)}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} className="h-2" />
      </div>

      {/* Панель ввода (Кнопки) */}
      <div className="relative z-10 w-full shrink-0 border-t border-zinc-800/50 bg-[#0a0a0a] px-2 py-3 pb-safe">
        {micError && <p className="mb-2 px-2 text-xs text-red-500 font-medium">{micError}</p>}
        <form onSubmit={send} className="flex w-full items-center gap-1.5">
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
          
          <button type="button" onClick={() => fileInputRef.current?.click()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-purple-400 hover:bg-zinc-800/50">
            <Paperclip className="h-5 w-5" />
          </button>
          
          <input disabled={recording} value={text} onChange={(e) => setText(e.target.value)} placeholder="Сообщение..." className="min-w-0 flex-1 rounded-full bg-[#18181b] px-4 py-2.5 text-[15px] text-white outline-none" />
          
          <button type="button" onClick={toggleRecord} className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${recording ? "bg-red-500/20 text-red-500 animate-pulse" : "text-purple-400 hover:bg-zinc-800/50"}`}>
            {recording ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-5 w-5" />}
          </button>

          <button type="submit" disabled={sending || !text.trim() || recording} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-[#7c3aed] to-[#a855f7] text-white disabled:opacity-50">
            <Navigation className="h-5 w-5 ml-0.5" />
          </button>
        </form>
      </div>

      {/* Модалка удаления */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-3xl bg-[#1f1f22] p-6">
            <h3 className="mb-2 text-lg text-white font-semibold">Удалить сообщение?</h3>
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