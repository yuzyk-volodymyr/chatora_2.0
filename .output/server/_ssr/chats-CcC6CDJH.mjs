import { n as __toESM } from "../_runtime.mjs";
import { t as supabase } from "./client-BnR7D8X1.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { i as useAuth, n as applyDirection, r as t } from "./i18n-BxFneI8o.mjs";
import { n as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { t as CallProvider } from "./call-BvZR4JOr.mjs";
import { b as useNavigate, h as Outlet } from "../_libs/@tanstack/react-router+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/chats-CcC6CDJH.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function ChatsLayout() {
	const navigate = useNavigate();
	const { user, loading } = useAuth();
	const [profile, setProfile] = (0, import_react.useState)(null);
	const tr = t(profile?.preferred_language);
	(0, import_react.useEffect)(() => {
		if (profile) applyDirection(profile.preferred_language);
	}, [profile]);
	(0, import_react.useEffect)(() => {
		if (!loading && !user) navigate({
			to: "/",
			replace: true
		});
	}, [
		loading,
		user,
		navigate
	]);
	(0, import_react.useEffect)(() => {
		if (!user) return;
		(async () => {
			const raw = localStorage.getItem("chatora_pending_profile");
			if (raw) {
				localStorage.removeItem("chatora_pending_profile");
				try {
					const p = JSON.parse(raw);
					await supabase.from("profiles").update({
						gender: p.gender,
						preferred_language: p.preferred_language
					}).eq("id", user.id);
				} catch {}
			}
			const { data } = await supabase.from("profiles").select("id, user_number, gender, preferred_language, is_premium").eq("id", user.id).maybeSingle();
			setProfile(data);
		})();
	}, [user]);
	async function signOut() {
		await supabase.auth.signOut();
		navigate({
			to: "/",
			replace: true
		});
	}
	if (loading || !user) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground",
		children: tr.loading
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto flex h-dvh max-h-dvh w-full max-w-2xl flex-col overflow-hidden bg-background",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
			className: "flex shrink-0 items-center justify-between border-b border-border px-5 py-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: "/icon-192.png",
					alt: tr.appName,
					className: "h-11 w-11 rounded-2xl"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs uppercase tracking-wide text-muted-foreground",
					children: tr.appName
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-base font-semibold text-foreground",
					children: profile?.user_number ?? tr.loading
				})] })]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				onClick: signOut,
				className: "rounded-2xl border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted",
				children: tr.signOut
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CallProvider, {
			userId: user.id,
			myNumber: profile?.user_number ?? "",
			lang: profile?.preferred_language ?? "ru",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex min-h-0 flex-1 flex-col",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {})
			})
		})]
	});
}
//#endregion
export { ChatsLayout as component };
