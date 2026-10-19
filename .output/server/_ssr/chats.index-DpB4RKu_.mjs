import { n as __toESM } from "../_runtime.mjs";
import { t as supabase } from "./client-BnR7D8X1.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { i as useAuth, r as t } from "./i18n-BxFneI8o.mjs";
import { n as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { c as Check, t as UserPlus } from "../_libs/lucide-react.mjs";
import { b as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as Slot } from "../_libs/radix-ui__react-slot.mjs";
import { n as clsx, t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/chats.index-DpB4RKu_.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
var buttonVariants = cva("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0", {
	variants: {
		variant: {
			default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
			destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
			outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
			secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
			ghost: "hover:bg-accent hover:text-accent-foreground",
			link: "text-primary underline-offset-4 hover:underline"
		},
		size: {
			default: "h-9 px-4 py-2",
			sm: "h-8 rounded-md px-3 text-xs",
			lg: "h-10 rounded-md px-8",
			icon: "h-9 w-9"
		}
	},
	defaultVariants: {
		variant: "default",
		size: "default"
	}
});
var Button = import_react.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(asChild ? Slot : "button", {
		className: cn(buttonVariants({
			variant,
			size,
			className
		})),
		ref,
		...props
	});
});
Button.displayName = "Button";
function PeopleList() {
	const navigate = useNavigate();
	const { user } = useAuth();
	const [people, setPeople] = (0, import_react.useState)([]);
	const [myLang, setMyLang] = (0, import_react.useState)("ru");
	const [pending, setPending] = (0, import_react.useState)(null);
	const [code, setCode] = (0, import_react.useState)("");
	const [searchError, setSearchError] = (0, import_react.useState)(null);
	const [inviteCopied, setInviteCopied] = (0, import_react.useState)(false);
	const inviteProcessed = (0, import_react.useRef)(false);
	const myNumber = people.find((p) => p.id === user?.id)?.user_number;
	const tr = t(myLang);
	(0, import_react.useEffect)(() => {
		if (!user) return;
		supabase.from("profiles").select("id, user_number, gender, preferred_language, is_premium").order("created_at", { ascending: false }).then(({ data }) => {
			const rows = data ?? [];
			const me = rows.find((p) => p.id === user.id);
			if (me) setMyLang(me.preferred_language);
			setPeople(rows);
		});
	}, [user]);
	(0, import_react.useEffect)(() => {
		if (!user || inviteProcessed.current) return;
		const inviteCode = localStorage.getItem("chatora_invite_code");
		if (!inviteCode) return;
		inviteProcessed.current = true;
		localStorage.removeItem("chatora_invite_code");
		findAndOpen(inviteCode);
	}, [user]);
	async function openChat(otherId) {
		if (!user) return;
		setPending(otherId);
		const pair = [user.id, otherId].sort();
		const a = pair[0];
		const b = pair[1];
		if (!a || !b) return;
		const { data: existing } = await supabase.from("conversations").select("id").eq("user_a", a).eq("user_b", b).maybeSingle();
		let id = existing?.id;
		if (!id) {
			const { data: created, error } = await supabase.from("conversations").insert({
				user_a: a,
				user_b: b
			}).select("id").single();
			if (error) {
				setPending(null);
				return;
			}
			id = created.id;
		}
		navigate({
			to: "/chats/$conversationId",
			params: { conversationId: id }
		});
	}
	async function findAndOpen(rawCode) {
		setSearchError(null);
		const digits = rawCode.replace(/\D/g, "");
		if (!digits) return;
		const { data } = await supabase.from("profiles").select("id").eq("user_number", `User#${digits}`).maybeSingle();
		if (!data || data.id === user?.id) {
			setSearchError(tr.notFound);
			return;
		}
		openChat(data.id);
	}
	async function search(e) {
		e.preventDefault();
		await findAndOpen(code);
	}
	async function inviteUser() {
		if (!myNumber) return;
		const digits = myNumber.replace(/\D/g, "");
		const url = `${window.location.origin}/?invite=${digits}`;
		const text = `${tr.inviteMessage} ${url}`;
		if (navigator.share) try {
			await navigator.share({
				title: tr.appName,
				text,
				url
			});
			return;
		} catch (error) {
			if (error instanceof DOMException && error.name === "AbortError") return;
		}
		await navigator.clipboard.writeText(text);
		setInviteCopied(true);
		window.setTimeout(() => setInviteCopied(false), 2500);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "min-h-0 flex-1 overflow-y-auto px-5 py-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				onSubmit: search,
				className: "mb-6 flex gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					value: code,
					onChange: (e) => setCode(e.target.value),
					placeholder: tr.searchCode,
					inputMode: "numeric",
					className: "flex-1 rounded-2xl border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-ring"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "submit",
					className: "rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90",
					children: tr.find
				})]
			}),
			searchError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "-mt-4 mb-4 text-sm text-destructive",
				children: searchError
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
				type: "button",
				variant: "outline",
				onClick: inviteUser,
				disabled: !myNumber,
				className: "mb-6 w-full justify-center gap-2",
				children: [inviteCopied ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-4 w-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserPlus, { className: "h-4 w-4" }), inviteCopied ? tr.inviteCopied : tr.invite]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground",
				children: tr.chats
			}),
			people.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted-foreground",
				children: tr.noPeople
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "space-y-2",
				children: people.filter((p) => p.id !== user?.id).map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					onClick: () => openChat(p.id),
					disabled: pending === p.id,
					className: "flex w-full items-center gap-3 rounded-3xl border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-muted disabled:opacity-60",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-sm font-semibold text-secondary-foreground",
							children: p.gender === "female" ? "♀" : "♂"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "flex-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "block text-sm font-medium text-foreground",
								children: p.user_number
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "block text-xs text-muted-foreground",
								children: p.preferred_language.toUpperCase()
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-xs font-medium text-primary",
							children: tr.openChat
						})
					]
				}) }, p.id))
			})
		]
	});
}
//#endregion
export { PeopleList as component };
