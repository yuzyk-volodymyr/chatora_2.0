import { n as __toESM } from "../_runtime.mjs";
import { t as supabase } from "./client-BnR7D8X1.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { i as useAuth, r as t } from "./i18n-BxFneI8o.mjs";
import { n as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { n as Phone } from "../_libs/lucide-react.mjs";
import { n as callText, r as useCall } from "./call-BvZR4JOr.mjs";
import { y as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as Route } from "./chats._conversationId-CsEbFEDW.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/chats._conversationId-Dqafoc2z.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function dayKey(iso) {
	const d = new Date(iso);
	return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
function formatDialogDate(iso, locale) {
	const d = new Date(iso);
	const now = /* @__PURE__ */ new Date();
	const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const startOfMsg = new Date(d.getFullYear(), d.getMonth(), d.getDate());
	const diffDays = Math.round((startOfToday.getTime() - startOfMsg.getTime()) / 864e5);
	if (diffDays === 0) try {
		return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(0, "day");
	} catch {
		return "Today";
	}
	if (diffDays === 1) try {
		return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(-1, "day");
	} catch {
		return "Yesterday";
	}
	return d.toLocaleDateString(locale, {
		day: "numeric",
		month: "long",
		year: d.getFullYear() !== now.getFullYear() ? "numeric" : void 0
	});
}
function VoiceBubble({ path }) {
	const [url, setUrl] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		supabase.storage.from("voice").createSignedUrl(path, 3600).then(({ data }) => setUrl(data?.signedUrl ?? null));
	}, [path]);
	return url ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("audio", {
		controls: true,
		src: url,
		className: "h-10 max-w-[240px]"
	}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "…" });
}
function Conversation() {
	const { conversationId } = Route.useParams();
	const { user } = useAuth();
	const [messages, setMessages] = (0, import_react.useState)([]);
	const [other, setOther] = (0, import_react.useState)(null);
	const [myLang, setMyLang] = (0, import_react.useState)("ru");
	const [text, setText] = (0, import_react.useState)("");
	const [sending, setSending] = (0, import_react.useState)(false);
	const bottomRef = (0, import_react.useRef)(null);
	const recorderRef = (0, import_react.useRef)(null);
	const [recording, setRecording] = (0, import_react.useState)(false);
	const [micError, setMicError] = (0, import_react.useState)(null);
	const tr = t(myLang);
	const call = useCall();
	(0, import_react.useEffect)(() => {
		if (!user) return;
		let active = true;
		(async () => {
			const { data: convo } = await supabase.from("conversations").select("user_a, user_b").eq("id", conversationId).maybeSingle();
			if (!active || !convo) return;
			const otherId = convo.user_a === user.id ? convo.user_b : convo.user_a;
			const { data: profiles } = await supabase.from("profiles").select("id, user_number, gender, preferred_language, is_premium").in("id", [otherId, user.id]);
			if (!active) return;
			const rows = profiles ?? [];
			setOther(rows.find((p) => p.id === otherId) ?? null);
			const me = rows.find((p) => p.id === user.id);
			if (me) setMyLang(me.preferred_language);
			const { data: msgs } = await supabase.from("messages").select("id, sender_id, body, audio_path, created_at").eq("conversation_id", conversationId).order("created_at", { ascending: true });
			if (active) setMessages(msgs ?? []);
		})();
		return () => {
			active = false;
		};
	}, [conversationId, user]);
	(0, import_react.useEffect)(() => {
		const channel = supabase.channel(`messages-${conversationId}`).on("postgres_changes", {
			event: "INSERT",
			schema: "public",
			table: "messages",
			filter: `conversation_id=eq.${conversationId}`
		}, (payload) => {
			const row = payload.new;
			setMessages((prev) => prev.some((m) => m.id === row.id) ? prev : [...prev, row]);
		}).subscribe();
		return () => {
			supabase.removeChannel(channel);
		};
	}, [conversationId]);
	(0, import_react.useEffect)(() => {
		bottomRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages.length]);
	async function send(e) {
		e.preventDefault();
		const body = text.trim();
		if (!body || !user || sending) return;
		setSending(true);
		setText("");
		const { data, error } = await supabase.from("messages").insert({
			conversation_id: conversationId,
			sender_id: user.id,
			body
		}).select("id, sender_id, body, audio_path, created_at").single();
		if (!error && data) {
			const row = data;
			setMessages((prev) => prev.some((m) => m.id === row.id) ? prev : [...prev, row]);
		}
		setSending(false);
	}
	function addRow(row) {
		setMessages((prev) => prev.some((m) => m.id === row.id) ? prev : [...prev, row]);
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
			const chunks = [];
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
				const { data } = await supabase.from("messages").insert({
					conversation_id: conversationId,
					sender_id: user.id,
					audio_path: path
				}).select("id, sender_id, body, audio_path, created_at").single();
				if (data) addRow(data);
			};
			recorderRef.current = rec;
			rec.start();
			setRecording(true);
		} catch {
			setMicError(tr.micDenied);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "flex min-h-0 flex-1 flex-col overflow-hidden",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "z-20 flex shrink-0 items-center gap-3 border-b border-border bg-background/95 px-5 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/chats",
						className: "rounded-2xl border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted",
						children: tr.back
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "flex-1 truncate text-sm font-semibold text-foreground",
						children: other?.user_number ?? tr.loading
					}),
					other && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						disabled: call.busy,
						onClick: () => call.startCall(other.id, other.user_number),
						"aria-label": callText(myLang).call,
						title: callText(myLang).call,
						className: "flex h-9 w-9 items-center justify-center rounded-2xl border border-border text-primary transition-colors hover:bg-muted disabled:opacity-50",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Phone, { className: "h-4 w-4" })
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-5 py-5",
				children: [
					messages.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted-foreground",
						children: tr.noMessages
					}),
					messages.map((m, index) => {
						const mine = m.sender_id === user?.id;
						const prev = index > 0 ? messages[index - 1] : null;
						const showDate = !prev || dayKey(prev.created_at) !== dayKey(m.created_at);
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [showDate && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "my-3 flex justify-center",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "rounded-full bg-muted px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-sm",
								children: formatDialogDate(m.created_at, myLang)
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: `flex ${mine ? "justify-end" : "justify-start"}`,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: `max-w-[75%] rounded-3xl px-4 py-2.5 text-sm shadow-sm ${mine ? "bg-primary text-primary-foreground" : "border border-border bg-card text-card-foreground"}`,
								children: [m.audio_path ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VoiceBubble, { path: m.audio_path }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									dir: "auto",
									className: "whitespace-pre-wrap break-words",
									children: m.body
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: `mt-1 text-[10px] ${mine ? "opacity-70 text-right" : "text-muted-foreground"}`,
									children: new Date(m.created_at).toLocaleTimeString([], {
										hour: "2-digit",
										minute: "2-digit"
									})
								})]
							})
						})] }, m.id);
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { ref: bottomRef })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "shrink-0 border-t border-border bg-background",
				children: [micError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "px-5 pt-2 text-xs text-destructive",
					children: micError
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					onSubmit: send,
					className: "flex items-center gap-2 px-4 py-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: toggleRecord,
							"aria-label": tr.voice,
							className: `flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border text-lg transition-colors ${recording ? "animate-pulse border-destructive bg-destructive text-destructive-foreground" : "border-border bg-background text-primary hover:bg-muted"}`,
							children: recording ? "■" : "🎤"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							disabled: recording,
							dir: "auto",
							value: text,
							onChange: (e) => setText(e.target.value),
							placeholder: recording ? tr.recording : tr.typeMessage,
							className: "flex-1 rounded-2xl border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-ring"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "submit",
							disabled: sending || !text.trim(),
							className: "rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50",
							children: tr.send
						})
					]
				})]
			})
		]
	});
}
//#endregion
export { Conversation as component };
