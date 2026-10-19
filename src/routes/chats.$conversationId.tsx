import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type Profile } from "@/hooks/useAuth";
import { t } from "@/lib/i18n";
import { useCall, callText } from "@/lib/call";
import { Phone } from "lucide-react";

export const Route = createFileRoute("/chats/$conversationId")({
  component: Conversation,
});

type Message = {
  id: string;
  sender_id: string;
  body: string | null;
  audio_path: string | null;
  created_at: string;
};


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
    try {
      return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(0, "day");
    } catch {
      return "Today";
    }
  }
  if (diffDays === 1) {
    try {
      return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(-1, "day");
    } catch {
      return "Yesterday";
    }
  }
  return d.toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function VoiceBubble({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    supabase.storage
      .from("voice")
      .createSignedUrl(path, 3600)
      .then(({ data }) => setUrl(data?.signedUrl ?? null));
  }, [path]);
  return url ? <audio controls src={url} className="h-10 max-w-[240px]" /> : <span>…</span>;
}

function Conversation() {
  const { conversationId } = Route.useParams();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [other, setOther] = useState<Profile | null>(null);
  const [myLang, setMyLang] = useState<string>("ru");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const [recording, setRecording] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const tr = t(myLang);
  const call = useCall();

  useEffect(() => {
    if (!user) return;
    let active = true;

    (async () => {
      const { data: convo } = await supabase
        .from("conversations")
        .select("user_a, user_b")
        .eq("id", conversationId)
        .maybeSingle();
      if (!active || !convo) return;
      const otherId = convo.user_a === user.id ? convo.user_b : convo.user_a;
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, user_number, gender, preferred_language, is_premium")
        .in("id", [otherId, user.id]);
      if (!active) return;
      const rows = (profiles ?? []) as Profile[];
      setOther(rows.find((p) => p.id === otherId) ?? null);
      const me = rows.find((p) => p.id === user.id);
      if (me) setMyLang(me.preferred_language);

      const { data: msgs } = await supabase
        .from("messages")
        .select("id, sender_id, body, audio_path, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (active) setMessages((msgs ?? []) as Message[]);
    })();

    return () => {
      active = false;
    };
  }, [conversationId, user]);

  useEffect(() => {
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const row = payload.new as Message;
          setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
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

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || !user || sending) return;
    setSending(true);
    setText("");
    const { data, error } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, sender_id: user.id, body })
      .select("id, sender_id, body, audio_path, created_at")
      .single();
    if (!error && data) {
      const row = data as Message;
      setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
    }
    setSending(false);
  }

  function addRow(row: Message) {
    setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
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
      rec.ondataavailable = (ev) => ev.data.size && chunks.push(ev.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((tk) => tk.stop());
        if (!user || chunks.length === 0) return;
        const type = rec.mimeType || "audio/webm";
        const ext = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
        const blob = new Blob(chunks, { type });
        const path = `${conversationId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("voice")
          .upload(path, blob, { contentType: type });
        if (upErr) return;
        const { data } = await supabase
          .from("messages")
          .insert({ conversation_id: conversationId, sender_id: user.id, audio_path: path })
          .select("id, sender_id, body, audio_path, created_at")
          .single();
        if (data) addRow(data as Message);
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      setMicError(tr.micDenied);
    }
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Sticky dialog header — always on top */}
      <div className="z-20 flex shrink-0 items-center gap-3 border-b border-border bg-background/95 px-5 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <Link
          to="/chats"
          className="rounded-2xl border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
        >
          {tr.back}
        </Link>
        <span className="flex-1 truncate text-sm font-semibold text-foreground">
          {other?.user_number ?? tr.loading}
        </span>
        {other && (
          <button
            type="button"
            disabled={call.busy}
            onClick={() => call.startCall(other.id, other.user_number)}
            aria-label={callText(myLang).call}
            title={callText(myLang).call}
            className="flex h-9 w-9 items-center justify-center rounded-2xl border border-border text-primary transition-colors hover:bg-muted disabled:opacity-50"
          >
            <Phone className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Scrollable messages only */}
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-5 py-5">
        {messages.length === 0 && <p className="text-sm text-muted-foreground">{tr.noMessages}</p>}
        {messages.map((m, index) => {
          const mine = m.sender_id === user?.id;
          const prev = index > 0 ? messages[index - 1] : null;
          const showDate = !prev || dayKey(prev.created_at) !== dayKey(m.created_at);
          return (
            <div key={m.id}>
              {showDate && (
                <div className="my-3 flex justify-center">
                  <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-sm">
                    {formatDialogDate(m.created_at, myLang)}
                  </span>
                </div>
              )}
              <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-3xl px-4 py-2.5 text-sm shadow-sm ${
                    mine
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-card text-card-foreground"
                  }`}
                >
                  {m.audio_path ? (
                    <VoiceBubble path={m.audio_path} />
                  ) : (
                    <p dir="auto" className="whitespace-pre-wrap break-words">{m.body}</p>
                  )}
                  <p className={`mt-1 text-[10px] ${mine ? "opacity-70 text-right" : "text-muted-foreground"}`}>
                    {new Date(m.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Sticky composer at bottom */}
      <div className="shrink-0 border-t border-border bg-background">
        {micError && <p className="px-5 pt-2 text-xs text-destructive">{micError}</p>}
        <form onSubmit={send} className="flex items-center gap-2 px-4 py-3">
          <button
            type="button"
            onClick={toggleRecord}
            aria-label={tr.voice}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border text-lg transition-colors ${
              recording
                ? "animate-pulse border-destructive bg-destructive text-destructive-foreground"
                : "border-border bg-background text-primary hover:bg-muted"
            }`}
          >
            {recording ? "■" : "🎤"}
          </button>
          <input
            disabled={recording}
            dir="auto"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={recording ? tr.recording : tr.typeMessage}
            className="flex-1 rounded-2xl border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-ring"
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            className="rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {tr.send}
          </button>
        </form>
      </div>
    </main>
  );
}
