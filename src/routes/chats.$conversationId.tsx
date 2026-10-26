import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type Profile } from "@/hooks/useAuth";
import { t } from "@/lib/i18n";
import { useCall, callText } from "@/lib/call";
import { Phone, MoreVertical, Paperclip, Mic, Square, Pencil, Trash2, X } from "lucide-react";

export const Route = createFileRoute("/chats/$conversationId")({
  component: Conversation,
});

type Message = {
  id: string;
  sender_id: string;
  body: string | null;
  audio_path: string | null;
  created_at: string;
  is_edited?: boolean;
};

async function logChatDebug(message: string) {
  try {
    const { error } = await supabase.from("debug_logs").insert({ message });
    if (error) console.error("Не удалось записать лог чата:", error);
  } catch (error) {
    console.error("Не удалось записать лог чата:", error);
  }
}

function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function formatDialogDate(iso: string, locale: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMsg = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startOfToday.getTime() - startOfMsg.getTime()) / 86400000);

  if (diffDays === 0) {
    try { return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(0, "day"); } catch { return "Today"; }
  }
  if (diffDays === 1) {
    try { return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(-1, "day"); } catch { return "Yesterday"; }
  }
  return d.toLocaleDateString(locale, { day: "numeric", month: "long", year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined });
}

function VoiceBubble({ path, mine }: { path: string; mine: boolean }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    supabase.storage.from("voice").createSignedUrl(path, 3600).then(({ data }) => setUrl(data?.signedUrl ?? null));
  }, [path]);
  return url ? (
    <audio controls src={url} className={`h-10 max-w-[240px] ${mine ? "opacity-90" : ""}`} />
  ) : (
    <span>…</span>
  );
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
  
  // Состояния для меню, редактирования и удаления
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const [recording, setRecording] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  
  // Таймер для долгого нажатия
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const tr = t(myLang);
  const call = useCall();

  // 1. Загрузка данных
  useEffect(() => {
    if (!user) return;
    let active = true;

    (async () => {
      const { data: convo } = await supabase.from("conversations").select("user_a, user_b").eq("id", conversationId).maybeSingle();
      if (!active || !convo) return;
      
      const otherId = convo.user_a === user.id ? convo.user_b : convo.user_a;
      
      const { data: profiles } = await supabase.from("profiles").select("id, user_number, gender, preferred_language, is_premium").in("id", [otherId, user.id]);
      if (!active) return;
      
      const rows = (profiles ?? []) as Profile[];
      setOther(rows.find((p) => p.id === otherId) ?? null);
      const me = rows.find((p) => p.id === user.id);
      if (me) setMyLang(me.preferred_language);

      const { data: aliasData } = await supabase.from("contact_aliases").select("alias").eq("owner_id", user.id).eq("contact_id", otherId).maybeSingle();
      if (active && aliasData) setCustomName(aliasData.alias);

      const { data: msgs } = await supabase.from("messages").select("*").eq("conversation_id", conversationId).order("created_at", { ascending: true });
      if (active) setMessages((msgs ?? []) as Message[]);
      
      await supabase.from("messages").update({ is_read: true }).eq("conversation_id", conversationId).neq("sender_id", user.id).eq("is_read", false);
    })();

    return () => { active = false; };
  }, [conversationId, user]);

  // 2. Подписка на Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const row = payload.new as Message;
            setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
            if (row.sender_id !== user?.id) {
               supabase.from("messages").update({ is_read: true }).eq("id", row.id).then();
            }
          } else if (payload.eventType === 'UPDATE') {
            const row = payload.new as Message;
            setMessages((prev) => prev.map(m => m.id === row.id ? row : m));
          } else if (payload.eventType === 'DELETE') {
            const oldRow = payload.old as Message;
            setMessages((prev) => prev.filter(m => m.id !== oldRow.id));
          }
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, user?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Логика долгого нажатия
  const startPress = (id: string, mine: boolean) => {
    if (!mine) return;
    longPressTimer.current = setTimeout(() => {
      setActiveMenuId(id);
      if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(50);
      }
    }, 500);
  };

  const endPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  // Отправка текста
  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || !user || sending) return;
    setSending(true);
    setText("");
    const { data, error } = await supabase.from("messages").insert({ conversation_id: conversationId, sender_id: user.id, body }).select("*").single();
    if (!error && data) {
      const row = data as Message;
      setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
    }
    setSending(false);
  }

  // Удаление (открывает модальное окно)
  function confirmDelete(id: string) {
    setActiveMenuId(null);
    setDeleteConfirmId(id);
  }

  // Само удаление (после подтверждения) — ТОЛЬКО ЛОГИ В БАЗУ
  async function executeDelete() {
    if (!deleteConfirmId) return;
    const id = deleteConfirmId;
    setDeleteConfirmId(null);

    await logChatDebug(`Старт удаления сообщения ID: ${id}`);

    const { error, count } = await supabase
      .from("messages")
      .delete({ count: "exact" })
      .eq("id", id)
      .select("id");

    if (error) {
      await logChatDebug(`Ошибка удаления сообщения: ${error.message}`);
    } else if (count === 0) {
      await logChatDebug("Удаление не изменило строки: сообщение не найдено или нет прав");
    } else {
      setMessages((prev) => prev.filter(m => m.id !== id));
      await logChatDebug(`Сообщение ID ${id} удалено`);
    }
  }

  // Редактирование — ТОЛЬКО ЛОГИ В БАЗУ
  async function handleSaveEdit() {
    if (!editText.trim() || !editingId) return;
    const newBody = editText.trim();
    const id = editingId;

    await logChatDebug(`Старт редактирования сообщения ID: ${id}`);

    const { error, count } = await supabase
      .from("messages")
      .update({ body: newBody, is_edited: true }, { count: "exact" })
      .eq("id", id)
      .select("id");

    if (error) {
      await logChatDebug(`Ошибка редактирования сообщения: ${error.message}`);
    } else if (count === 0) {
      await logChatDebug("Редактирование не изменило строки: сообщение не найдено или нет прав");
    } else {
      setEditingId(null);
      setMessages(prev => prev.map(m => m.id === id ? { ...m, body: newBody, is_edited: true } : m));
      await logChatDebug(`Сообщение ID ${id} отредактировано`);
    }
  }

  // Запись голоса
  async function toggleRecord() {
    if (recording) {
      recorderRef.current?.stop();
      setRecording(false);
      return;
    }
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      rec.ondataavailable = (ev) => ev.data.size && chunks.push(ev.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((tk) => tk.stop());
        if (!user || chunks.length === 0) return;
        const type = rec.mimeType || "audio/webm";
        const ext = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
        const blob = new Blob(chunks, { type });
        const path = `${conversationId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("voice").upload(path, blob, { contentType: type });
        if (upErr) return;
        const { data } = await supabase.from("messages").insert({ conversation_id: conversationId, sender_id: user.id, audio_path: path }).select("*").single();
        if (data) setMessages(prev => [...prev, data as Message]);
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      setMicError(tr.micDenied);
    }
  }

  return (
    <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[#0a0a0a]">
      
      {/* Невидимый оверлей для закрытия меню */}
      {activeMenuId && (
        <div className="fixed inset-0 z-40" onClick={() => setActiveMenuId(null)} />
      )}

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

      {/* Шапка чата */}
      <div className="relative z-10 flex shrink-0 items-center gap-3 border-b border-zinc-800/50 bg-[#0a0a0a]/95 px-4 py-3 backdrop-blur">
        <Link to="/chats" className="rounded-full bg-zinc-800/50 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800">
          {tr.back}
        </Link>
        <span className="flex-1 truncate text-base font-semibold text-white">
          {customName ?? other?.user_number ?? tr.loading}
        </span>
        <div className="flex items-center gap-2">
          {other && (
            <button type="button" disabled={call.busy} onClick={() => call.startCall(other.id, other.user_number)} className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800/50 text-purple-400 transition-colors hover:bg-zinc-800 disabled:opacity-50">
              <Phone className="h-4 w-4" />
            </button>
          )}
          <button className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800/50 text-zinc-300 transition-colors hover:bg-zinc-800">
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Область сообщений */}
      <div className="relative z-10 min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4">
        {messages.length === 0 && <p className="text-sm text-zinc-500 text-center mt-10">{tr.noMessages}</p>}
        
        {messages.map((m, index) => {
          const mine = m.sender_id === user?.id;
          const prev = index > 0 ? messages[index - 1] : null;
          const showDate = !prev || dayKey(prev.created_at) !== dayKey(m.created_at);
          
          return (
            <div key={m.id}>
              {showDate && (
                <div className="my-4 flex justify-center">
                  <span className="rounded-full bg-zinc-800/80 px-3 py-1 text-[11px] font-medium text-zinc-400">
                    {formatDialogDate(m.created_at, myLang)}
                  </span>
                </div>
              )}
              <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                
                <div 
                  onTouchStart={() => startPress(m.id, mine)}
                  onTouchEnd={endPress}
                  onTouchMove={endPress}
                  onMouseDown={() => startPress(m.id, mine)}
                  onMouseUp={endPress}
                  onMouseLeave={endPress}
                  className={`relative select-none max-w-[80%] rounded-3xl px-4 py-2.5 text-[15px] shadow-sm transition-transform active:scale-[0.98] ${mine ? "bg-gradient-to-tr from-[#7c3aed] to-[#a855f7] text-white rounded-br-sm" : "bg-[#1f1f22] text-zinc-100 rounded-bl-sm border border-zinc-800/50"}`}
                >
                  
                  {/* Выпадающее меню */}
                  {activeMenuId === m.id && (
                    <div 
                      className="absolute right-0 top-full mt-1 z-50 w-32 rounded-xl border border-zinc-700 bg-zinc-800 p-1 shadow-xl"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {m.body && (
                        <button onClick={() => { setEditingId(m.id); setEditText(m.body || ""); setActiveMenuId(null); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-white hover:bg-zinc-700">
                          <Pencil className="h-3 w-3" /> Изменить
                        </button>
                      )}
                      <button onClick={() => confirmDelete(m.id)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-red-400 hover:bg-zinc-700">
                        <Trash2 className="h-3 w-3" /> Удалить
                      </button>
                    </div>
                  )}

                  {/* Режим редактирования */}
                  {editingId === m.id ? (
                    <div className="flex flex-col gap-2">
                      <input 
                        autoFocus
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full rounded-md bg-black/20 px-2 py-1 text-white outline-none"
                      />
                      <div className="flex justify-end gap-2 text-xs">
                        <button onClick={() => setEditingId(null)} className="text-zinc-300 hover:text-white"><X className="h-4 w-4"/></button>
                        <button onClick={handleSaveEdit} className="text-green-400 hover:text-green-300 font-bold">Сохранить</button>
                      </div>
                    </div>
                  ) : (
                    m.audio_path ? (
                      <VoiceBubble path={m.audio_path} mine={mine} />
                    ) : (
                      <p dir="auto" className="whitespace-pre-wrap break-words">{m.body}</p>
                    )
                  )}
                  
                  <div className={`mt-1.5 flex items-center justify-end gap-1`}>
                     {m.is_edited && <span className="text-[9px] opacity-70 italic mr-1">изм.</span>}
                     <p className={`text-[10px] ${mine ? "text-purple-200" : "text-zinc-500"}`}>
                      {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
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
          <button type="button" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-purple-400 hover:bg-zinc-800/50 transition-colors">
            <Paperclip className="h-5 w-5" />
          </button>
          
          <input
            disabled={recording}
            dir="auto"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={recording ? tr.recording : tr.typeMessage}
            className="min-w-0 flex-1 rounded-full border border-zinc-800 bg-[#18181b] px-4 py-2.5 text-[15px] text-white placeholder-zinc-500 outline-none focus:border-purple-500/50 focus:bg-[#1f1f22] transition-colors"
          />

          <button type="button" onClick={toggleRecord} className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${recording ? "bg-red-500/20 text-red-500 animate-pulse" : "text-purple-400 hover:bg-zinc-800/50"}`}>
            {recording ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-5 w-5" />}
          </button>

          <button type="submit" disabled={sending || !text.trim() || recording} className="flex h-10 shrink-0 items-center justify-center rounded-full bg-[#7c3aed] px-4 text-sm font-semibold text-white transition-opacity hover:bg-[#6d28d9] disabled:opacity-50 disabled:bg-zinc-800">
            ТЕСТ 999
          </button>
        </form>
      </div>

      {/* Кастомное окно подтверждения удаления */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-zinc-800 bg-[#1f1f22] p-6 shadow-2xl">
            <h3 className="mb-2 text-lg font-semibold text-white">Удалить сообщение?</h3>
            <p className="mb-6 text-sm text-zinc-400">
              Это действие нельзя отменить. Сообщение исчезнет у вас и у собеседника.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="rounded-xl px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
              >
                Отмена
              </button>
              <button
                onClick={executeDelete}
                className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}