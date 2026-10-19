import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { Phone, PhoneOff, Mic, MicOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Status = "idle" | "calling" | "ringing" | "connecting" | "active";
type Signal =
  | { type: "invite"; from: string; fromNumber: string; callId: string }
  | { type: "accept"; from: string; callId: string }
  | { type: "decline"; from: string; callId: string }
  | { type: "offer"; from: string; callId: string; sdp: RTCSessionDescriptionInit }
  | { type: "answer"; from: string; callId: string; sdp: RTCSessionDescriptionInit }
  | { type: "ice"; from: string; callId: string; candidate: RTCIceCandidateInit }
  | { type: "hangup"; from: string; callId: string };

type CT = { call: string; calling: string; incoming: string; accept: string; decline: string; hangup: string; connecting: string; inCall: string; mute: string; micDenied: string };
const L: Record<string, CT> = {
  en: { call: "Call", calling: "Calling…", incoming: "Incoming call", accept: "Accept", decline: "Decline", hangup: "Hang up", connecting: "Connecting…", inCall: "In call", mute: "Mute", micDenied: "Microphone access denied." },
  ru: { call: "Позвонить", calling: "Вызов…", incoming: "Входящий звонок", accept: "Принять", decline: "Отклонить", hangup: "Завершить", connecting: "Соединение…", inCall: "Идёт звонок", mute: "Без звука", micDenied: "Нет доступа к микрофону." },
  uk: { call: "Зателефонувати", calling: "Виклик…", incoming: "Вхідний дзвінок", accept: "Прийняти", decline: "Відхилити", hangup: "Завершити", connecting: "З'єднання…", inCall: "Триває дзвінок", mute: "Без звуку", micDenied: "Немає доступу до мікрофона." },
  de: { call: "Anrufen", calling: "Anruf…", incoming: "Eingehender Anruf", accept: "Annehmen", decline: "Ablehnen", hangup: "Auflegen", connecting: "Verbinde…", inCall: "Im Gespräch", mute: "Stumm", micDenied: "Kein Mikrofonzugriff." },
  fr: { call: "Appeler", calling: "Appel…", incoming: "Appel entrant", accept: "Accepter", decline: "Refuser", hangup: "Raccrocher", connecting: "Connexion…", inCall: "En appel", mute: "Muet", micDenied: "Accès au micro refusé." },
  es: { call: "Llamar", calling: "Llamando…", incoming: "Llamada entrante", accept: "Aceptar", decline: "Rechazar", hangup: "Colgar", connecting: "Conectando…", inCall: "En llamada", mute: "Silenciar", micDenied: "Acceso al micrófono denegado." },
  tr: { call: "Ara", calling: "Aranıyor…", incoming: "Gelen arama", accept: "Kabul et", decline: "Reddet", hangup: "Kapat", connecting: "Bağlanıyor…", inCall: "Görüşmede", mute: "Sessiz", micDenied: "Mikrofon erişimi reddedildi." },
  kk: { call: "Қоңырау шалу", calling: "Шақыру…", incoming: "Кіріс қоңырау", accept: "Қабылдау", decline: "Бас тарту", hangup: "Аяқтау", connecting: "Қосылуда…", inCall: "Қоңырау жүріп жатыр", mute: "Дыбыссыз", micDenied: "Микрофонға рұқсат жоқ." },
  it: { call: "Chiama", calling: "Chiamata…", incoming: "Chiamata in arrivo", accept: "Accetta", decline: "Rifiuta", hangup: "Riaggancia", connecting: "Connessione…", inCall: "In chiamata", mute: "Muto", micDenied: "Accesso al microfono negato." },
  pt: { call: "Ligar", calling: "Chamando…", incoming: "Chamada recebida", accept: "Aceitar", decline: "Recusar", hangup: "Desligar", connecting: "Conectando…", inCall: "Em chamada", mute: "Mudo", micDenied: "Acesso ao microfone negado." },
  ar: { call: "اتصال", calling: "جارٍ الاتصال…", incoming: "مكالمة واردة", accept: "قبول", decline: "رفض", hangup: "إنهاء", connecting: "جارٍ الربط…", inCall: "في مكالمة", mute: "كتم", micDenied: "تم رفض الوصول إلى الميكروفون." },
  he: { call: "התקשר", calling: "מתקשר…", incoming: "שיחה נכנסת", accept: "קבל", decline: "דחה", hangup: "נתק", connecting: "מתחבר…", inCall: "בשיחה", mute: "השתק", micDenied: "הגישה למיקרופון נדחתה." },
};
export const callText = (lang?: string): CT => L[lang ?? "en"] ?? (L["en"] as CT);

const ICE: RTCConfiguration = {
  iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }],
};

type Ctx = { startCall: (peerId: string, peerNumber: string) => void; busy: boolean; lang: string };
const CallCtx = createContext<Ctx>({ startCall: () => {}, busy: false, lang: "en" });
export const useCall = () => useContext(CallCtx);

export function CallProvider({
  userId,
  myNumber,
  lang,
  children,
}: {
  userId: string;
  myNumber: string;
  lang: string;
  children: ReactNode;
}) {
  const tx = callText(lang);
  const [status, setStatus] = useState<Status>("idle");
  const [peer, setPeer] = useState<{ id: string; number: string } | null>(null);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const st = useRef({ status: "idle" as Status, callId: "", peerId: "" });
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const outbox = useRef<Map<string, RealtimeChannel>>(new Map());
  const pendingIce = useRef<RTCIceCandidateInit[]>([]);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const set = (s: Status) => {
    st.current.status = s;
    setStatus(s);
  };

  async function send(to: string, msg: Signal) {
    let ch = outbox.current.get(to);
    if (!ch) {
      ch = supabase.channel(`call-${to}`);
      outbox.current.set(to, ch);
      await new Promise<void>((res) => ch!.subscribe((s) => s === "SUBSCRIBED" && res()));
    }
    await ch.send({ type: "broadcast", event: "signal", payload: msg });
  }

  function cleanup() {
    if (timeout.current) clearTimeout(timeout.current);
    pcRef.current?.close();
    pcRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    pendingIce.current = [];
    st.current = { status: "idle", callId: "", peerId: "" };
    setStatus("idle");
    setPeer(null);
    setMuted(false);
    setSeconds(0);
  }

  async function makePc(peerId: string) {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    const pc = new RTCPeerConnection(ICE);
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    pc.ontrack = (e) => {
      if (audioRef.current) {
        audioRef.current.srcObject = e.streams[0] ?? null;
        audioRef.current.play().catch(() => {});
      }
    };
    pc.onicecandidate = (e) => {
      if (e.candidate)
        send(peerId, { type: "ice", from: userId, callId: st.current.callId, candidate: e.candidate.toJSON() });
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") set("active");
      if (pc.connectionState === "failed") hangup();
    };
    pcRef.current = pc;
    return pc;
  }

  async function flushIce() {
    const pc = pcRef.current;
    if (!pc) return;
    for (const c of pendingIce.current) await pc.addIceCandidate(c).catch(() => {});
    pendingIce.current = [];
  }

  async function startCall(peerId: string, peerNumber: string) {
    if (st.current.status !== "idle") return;
    setError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      s.getTracks().forEach((t) => t.stop());
    } catch {
      setError(tx.micDenied);
      return;
    }
    const callId = crypto.randomUUID();
    st.current = { status: "calling", callId, peerId };
    setStatus("calling");
    setPeer({ id: peerId, number: peerNumber });
    await send(peerId, { type: "invite", from: userId, fromNumber: myNumber, callId });
    timeout.current = setTimeout(() => {
      if (st.current.status === "calling") hangup();
    }, 45000);
  }

  async function accept() {
    const { peerId, callId } = st.current;
    set("connecting");
    try {
      await makePc(peerId);
    } catch {
      setError(tx.micDenied);
      await send(peerId, { type: "decline", from: userId, callId });
      cleanup();
      return;
    }
    await send(peerId, { type: "accept", from: userId, callId });
  }

  async function decline() {
    const { peerId, callId } = st.current;
    if (peerId) await send(peerId, { type: "decline", from: userId, callId });
    cleanup();
  }

  async function hangup() {
    const { peerId, callId } = st.current;
    if (peerId) await send(peerId, { type: "hangup", from: userId, callId }).catch(() => {});
    cleanup();
  }

  useEffect(() => {
    const ch = supabase
      .channel(`call-${userId}`)
      .on("broadcast", { event: "signal" }, async ({ payload }) => {
        const m = payload as Signal;
        const cur = st.current;
        if (m.type === "invite") {
          if (cur.status !== "idle") {
            send(m.from, { type: "decline", from: userId, callId: m.callId });
            return;
          }
          st.current = { status: "ringing", callId: m.callId, peerId: m.from };
          setStatus("ringing");
          setPeer({ id: m.from, number: m.fromNumber });
          return;
        }
        if (m.callId !== cur.callId || m.from !== cur.peerId) return;
        if (m.type === "accept" && cur.status === "calling") {
          if (timeout.current) clearTimeout(timeout.current);
          set("connecting");
          const pc = await makePc(m.from);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          send(m.from, { type: "offer", from: userId, callId: cur.callId, sdp: offer });
        } else if (m.type === "offer" && pcRef.current) {
          await pcRef.current.setRemoteDescription(m.sdp);
          await flushIce();
          const ans = await pcRef.current.createAnswer();
          await pcRef.current.setLocalDescription(ans);
          send(m.from, { type: "answer", from: userId, callId: cur.callId, sdp: ans });
        } else if (m.type === "answer" && pcRef.current) {
          await pcRef.current.setRemoteDescription(m.sdp);
          await flushIce();
        } else if (m.type === "ice") {
          const pc = pcRef.current;
          if (pc?.remoteDescription) await pc.addIceCandidate(m.candidate).catch(() => {});
          else pendingIce.current.push(m.candidate);
        } else if (m.type === "decline" || m.type === "hangup") {
          cleanup();
        }
      })
      .subscribe();
    const boxes = outbox.current;
    return () => {
      supabase.removeChannel(ch);
      boxes.forEach((c) => supabase.removeChannel(c));
      boxes.clear();
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (status !== "active") return;
    const i = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(i);
  }, [status]);

  function toggleMute() {
    const next = !muted;
    streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
    setMuted(next);
  }

  const label =
    status === "calling" ? tx.calling
    : status === "ringing" ? tx.incoming
    : status === "connecting" ? tx.connecting
    : `${tx.inCall} · ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <CallCtx.Provider value={{ startCall, busy: status !== "idle", lang }}>
      {children}
      <audio ref={audioRef} autoPlay className="hidden" />
      {error && status === "idle" && (
        <div className="fixed inset-x-0 bottom-24 mx-auto w-fit rounded-2xl bg-destructive px-4 py-2 text-xs text-destructive-foreground" onClick={() => setError(null)}>
          {error}
        </div>
      )}
      {status !== "idle" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-72 rounded-3xl border border-border bg-card p-6 text-center shadow-xl">
            <div className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground ${status !== "active" ? "animate-pulse" : ""}`}>
              <Phone className="h-8 w-8" />
            </div>
            <p className="text-lg font-semibold text-foreground">{peer?.number}</p>
            <p className="mt-1 text-sm text-muted-foreground">{label}</p>
            <div className="mt-6 flex justify-center gap-4">
              {status === "ringing" ? (
                <>
                  <button onClick={decline} aria-label={tx.decline} className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
                    <PhoneOff className="h-6 w-6" />
                  </button>
                  <button onClick={accept} aria-label={tx.accept} className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Phone className="h-6 w-6" />
                  </button>
                </>
              ) : (
                <>
                  {status === "active" && (
                    <button onClick={toggleMute} aria-label={tx.mute} className={`flex h-14 w-14 items-center justify-center rounded-full border border-border ${muted ? "bg-muted text-foreground" : "bg-background text-primary"}`}>
                      {muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                    </button>
                  )}
                  <button onClick={hangup} aria-label={tx.hangup} className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
                    <PhoneOff className="h-6 w-6" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </CallCtx.Provider>
  );
}
