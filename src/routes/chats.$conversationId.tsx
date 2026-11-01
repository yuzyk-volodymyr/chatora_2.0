import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type Profile } from "@/hooks/useAuth";
import { t } from "@/lib/i18n";
import { useCall } from "@/lib/call";
import {
  Phone,
  Paperclip,
  Mic,
  Square,
  Pencil,
  Trash2,
  X,
  Navigation,
  Play,
  Pause,
} from "lucide-react";

export const Route = createFileRoute("/chats/$conversationId")({ component: Conversation });

type Message = {
  id: string;
  sender_id: string;
  body: string | null;
  audio_path: string | null;
  image_path: string | null;
  created_at: string;
  is_edited?: boolean;
  message_type?: string;
};

// 🎵 Кастомный плеер (как в ТГ)
function VoiceBubble({ path, mine }: { path: string; mine: boolean }) {
  const [url, setUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    supabase.storage
      .from("voice")
      .createSignedUrl(path, 3600)
      .then(({ data }) => {
        if (data?.signedUrl) setUrl(data.signedUrl);
      });
  }, [path]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className={`flex items-center gap-3 w-[200px] p-1 ${mine ? "text-white" : "text-white"}`}>
      {url && (
        <audio
          ref={audioRef}
          src={url}
          onTimeUpdate={() => {
            if (audioRef.current)
              setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100 || 0);
          }}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
      )}
      <button
        onClick={togglePlay}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 hover:bg-white/30"
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
      </button>
      <div className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
        <div
          className="h-full bg-white rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function ImageBubble({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    supabase.storage
      .from("voice")
      .createSignedUrl(path, 3600)
      .then(({ data }) => setUrl(data?.signedUrl ?? null));
  }, [path]);
  return url ? (
    <img src={url} alt="Файл" className="max-w-[220px] rounded-lg" />
  ) : (
    <span>Загрузка...</span>
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

  // Состояния для меню и редактирования/удаления
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [debugError, setDebugError] = useState<string | null>(null); // Для вывода ошибок на экран

  const [recording, setRecording] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const tr = t(myLang);
  const call = useCall();

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: convo } = await supabase
        .from("conversations")
        .select("user_a, user_b")
        .eq("id", conversationId)
        .maybeSingle();
      if (!convo) return;
      const otherId = convo.user_a === user.id ? convo.user_b : convo.user_a;

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, user_number, preferred_language")
        .in("id", [otherId, user.id]);
      const rows = (profiles ?? []) as Profile[];
      setOther(rows.find((p) => p.id === otherId) ?? null);
      if (rows.find((p) => p.id === user.id))
        setMyLang(rows.find((p) => p.id === user.id)!.preferred_language);

      const { data: msgs } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      setMessages((msgs ?? []) as Message[]);
    })();
  }, [conversationId, user]);

  useEffect(() => {
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT")
            setMessages((prev) => [...prev, payload.new as Message]);
          if (payload.eventType === "UPDATE")
            setMessages((prev) =>
              prev.map((m) =>
                m.id === (payload.new as Message).id ? (payload.new as Message) : m,
              ),
            );
          if (payload.eventType === "DELETE")
            setMessages((prev) => prev.filter((m) => m.id !== (payload.old as Message).id));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // --- ЛОГИКА ДОЛГОГО НАЖАТИЯ ---
  const handleTouchStart = (e: React.TouchEvent, id: string, mine: boolean) => {
    if (!mine) return;
    const touch = e.touches[0];
    if (!touch) return;
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    longPressTimer.current = setTimeout(() => {
      setActiveMenuId(id);
      if (window.navigator?.vibrate) window.navigator.vibrate(50);
    }, 500);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch || !touchStartPos.current || !longPressTimer.current) return;
    const dx = Math.abs(touch.clientX - touchStartPos.current.x);
    const dy = Math.abs(touch.clientY - touchStartPos.current.y);
    if (dx > 10 || dy > 10) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // --- ОТПРАВКА ---
  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || !user || sending) return;
    setSending(true);
    setText("");
    await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, sender_id: user.id, body });
    setSending(false);
  }

  // --- УДАЛЕНИЕ С ВЫВОДОМ ОШИБКИ ---
  async function executeDelete() {
    if (!deleteConfirmId) return;
    const idToDelete = deleteConfirmId;
    setDeleteConfirmId(null);
    setDebugError(null); // Очищаем старые ошибки

    // Пытаемся удалить и запрашиваем количество удаленных строк (.select())
    const { error, data } = await supabase.from("messages").delete().eq("id", idToDelete).select();

    if (error) {
      setDebugError(`Ошибка БД: ${error.message}`);
    } else if (data.length === 0) {
      setDebugError(
        "❌ Ошибка RLS: База данных не разрешила удалить (0 строк). Выполните SQL из шага 1.",
      );
    } else {
      // Если успешно, удаляем из локального стейта (Realtime тоже подхватит)
      setMessages((prev) => prev.filter((m) => m.id !== idToDelete));
    }
  }

  // --- РЕДАКТИРОВАНИЕ С ВЫВОДОМ ОШИБКИ ---
  async function handleSaveEdit() {
    if (!editText.trim() || !editingId) return;
    const newBody = editText.trim();
    const id = editingId;
    setDebugError(null);

    const { error, data } = await supabase
      .from("messages")
      .update({ body: newBody, is_edited: true })
      .eq("id", id)
      .select();

    if (error) {
      setDebugError(`Ошибка БД: ${error.message}`);
    } else if (data.length === 0) {
      setDebugError("❌ Ошибка RLS: Нет прав на изменение.");
    } else {
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, body: newBody, is_edited: true } : m)),
      );
      setEditingId(null);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setSending(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${conversationId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("voice")
        .upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      await supabase
        .from("messages")
        .insert({ conversation_id: conversationId, sender_id: user.id, image_path: path });
    } catch (err) {
      setDebugError(`Ошибка файла: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSending(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

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
      rec.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunks.push(ev.data);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach((tk) => tk.stop());
        if (!user || chunks.length === 0) return;
        const blob = new Blob(chunks, { type: "audio/webm" });
        const path = `${conversationId}/${crypto.randomUUID()}.webm`;
        await supabase.storage.from("voice").upload(path, blob, { contentType: "audio/webm" });
        await supabase
          .from("messages")
          .insert({ conversation_id: conversationId, sender_id: user.id, audio_path: path });
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      setMicError("Нет доступа к микрофону");
    }
  }

  return (
    <main className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[#0f0914]">
      {activeMenuId && <div className="fixed inset-0 z-40" onClick={() => setActiveMenuId(null)} />}

      <div className="relative z-10 flex w-full shrink-0 items-center gap-3 border-b border-zinc-800/50 bg-[#0f0914]/95 px-4 py-3 backdrop-blur">
        <Link
          to="/chats"
          className="rounded-full bg-zinc-800/50 px-3 py-1.5 text-xs text-zinc-300 shrink-0"
        >
          Назад
        </Link>
        <span className="flex-1 truncate text-base font-semibold text-white">
          {other?.user_number ?? "..."}
        </span>
        {other && (
          <button
            type="button"
            disabled={call.busy}
            onClick={() => call.startCall(other.id, other.user_number)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-800/50 text-purple-400 hover:bg-zinc-800 disabled:opacity-50"
          >
            <Phone className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="relative z-10 min-h-0 w-full flex-1 space-y-3 overflow-y-auto overflow-x-hidden px-4 py-4">
        {messages.map((m) => {
          const mine = m.sender_id === user?.id;

          if (m.message_type === "missed_call") {
            return (
              <div key={m.id} className="flex w-full justify-center my-2">
                <div
                  className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium ${mine ? "bg-red-500/20 text-red-400" : "bg-zinc-800 text-zinc-400"}`}
                >
                  <Phone className="h-3 w-3 rotate-90" />
                  {mine ? "Вы пропустили звонок" : "Пропущенный звонок"}
                </div>
              </div>
            );
          }

          return (
            <div key={m.id} className="w-full">
              <div className={`flex w-full ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  onTouchStart={(e) => handleTouchStart(e, m.id, mine)}
                  onTouchEnd={handleTouchEnd}
                  onTouchMove={handleTouchMove}
                  style={{ WebkitTouchCallout: "none" }}
                  className={`relative max-w-[85%] break-words select-none rounded-3xl px-4 py-2.5 text-[15px] shadow-lg ${mine ? "bg-gradient-to-tr from-[#7c3aed] to-[#a855f7] text-white rounded-br-sm" : "bg-[#1f1f22] text-zinc-100 rounded-bl-sm border border-zinc-800/50"}`}
                >
                  {/* Меню */}
                  {activeMenuId === m.id && (
                    <div className="absolute right-0 top-full mt-1 z-50 w-32 rounded-xl border border-zinc-700 bg-zinc-800 p-1 shadow-xl">
                      {m.body && m.message_type !== "missed_call" && (
                        <button
                          onClick={() => {
                            setEditingId(m.id);
                            setEditText(m.body || "");
                            setActiveMenuId(null);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-white hover:bg-zinc-700"
                        >
                          <Pencil className="h-3 w-3" /> Изменить
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setDeleteConfirmId(m.id);
                          setActiveMenuId(null);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-red-400 hover:bg-zinc-700"
                      >
                        <Trash2 className="h-3 w-3" /> Удалить
                      </button>
                    </div>
                  )}

                  {editingId === m.id ? (
                    <div className="flex flex-col gap-2 w-full min-w-[150px]">
                      <input
                        autoFocus
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full rounded-md bg-black/20 px-2 py-1 text-white outline-none"
                      />
                      <div className="flex justify-end gap-2 text-xs">
                        <button onClick={() => setEditingId(null)} className="text-zinc-300">
                          <X className="h-4 w-4" />
                        </button>
                        <button onClick={handleSaveEdit} className="text-green-400 font-bold">
                          ОК
                        </button>
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
                    <p className="text-[10px] opacity-70">
                      {new Date(m.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} className="h-2" />
      </div>

      <div className="relative z-10 w-full shrink-0 border-t border-zinc-800/50 bg-[#0f0914] px-2 py-3 pb-safe">
        {/* Вывод ошибок прямо на экран */}
        {debugError && (
          <p className="mb-2 px-2 text-xs text-red-500 font-bold bg-red-500/10 p-2 rounded-lg">
            {debugError}
          </p>
        )}
        {micError && <p className="mb-2 px-2 text-xs text-red-500 font-medium">{micError}</p>}

        <form onSubmit={send} className="flex w-full items-center gap-1.5">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-purple-400 hover:bg-zinc-800/50"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <input
            disabled={recording}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Сообщение..."
            className="min-w-0 flex-1 rounded-full bg-[#18181b] px-4 py-2.5 text-[15px] text-white outline-none"
          />
          <button
            type="button"
            onClick={toggleRecord}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${recording ? "bg-red-500/20 text-red-500 animate-pulse" : "text-purple-400 hover:bg-zinc-800/50"}`}
          >
            {recording ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-5 w-5" />}
          </button>
          <button
            type="submit"
            disabled={sending || !text.trim() || recording}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-[#7c3aed] to-[#a855f7] text-white disabled:opacity-50"
          >
            <Navigation className="h-5 w-5 ml-0.5" />
          </button>
        </form>
      </div>

      {/* Окно подтверждения удаления */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-zinc-800 bg-[#1f1f22] p-6 shadow-2xl">
            <h3 className="mb-2 text-lg text-white font-semibold">Удалить сообщение?</h3>
            <p className="mb-6 text-sm text-zinc-400">Это действие нельзя отменить.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="rounded-xl px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={executeDelete}
                className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 transition-colors"
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
