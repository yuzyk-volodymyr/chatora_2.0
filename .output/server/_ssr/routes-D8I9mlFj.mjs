import { n as __toESM } from "../_runtime.mjs";
import { t as supabase } from "./client-BnR7D8X1.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { i as useAuth, n as applyDirection, r as t, t as LANGUAGES } from "./i18n-BxFneI8o.mjs";
import { n as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { o as Eye, s as EyeOff } from "../_libs/lucide-react.mjs";
import { b as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as createLovableAuth } from "../_libs/lovable.dev__cloud-auth-js.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-D8I9mlFj.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var lovableAuth = createLovableAuth();
var lovable = { auth: { signInWithOAuth: async (provider, opts) => {
	const result = await lovableAuth.signInWithOAuth(provider, {
		...opts,
		extraParams: { ...opts?.extraParams }
	});
	if (result.redirected) return result;
	if (result.error) return result;
	try {
		await supabase.auth.setSession(result.tokens);
	} catch (e) {
		return { error: e instanceof Error ? e : new Error(String(e)) };
	}
	return result;
} } };
function Landing() {
	const navigate = useNavigate();
	const { session, loading } = useAuth();
	const [mode, setMode] = (0, import_react.useState)("up");
	const [lang, setLang] = (0, import_react.useState)("ru");
	const [gender, setGender] = (0, import_react.useState)("male");
	const [email, setEmail] = (0, import_react.useState)("");
	const [password, setPassword] = (0, import_react.useState)("");
	const [showPassword, setShowPassword] = (0, import_react.useState)(false);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	const [info, setInfo] = (0, import_react.useState)(null);
	const tr = t(lang);
	(0, import_react.useEffect)(() => {
		applyDirection(lang);
	}, [lang]);
	(0, import_react.useEffect)(() => {
		const inviteCode = new URLSearchParams(window.location.search).get("invite")?.replace(/\D/g, "");
		if (inviteCode) localStorage.setItem("chatora_invite_code", inviteCode);
	}, []);
	(0, import_react.useEffect)(() => {
		if (!loading && session) navigate({
			to: "/chats",
			replace: true
		});
	}, [
		loading,
		session,
		navigate
	]);
	async function submit(e) {
		e.preventDefault();
		setBusy(true);
		setError(null);
		setInfo(null);
		if (mode === "up") {
			const { data, error: err } = await supabase.auth.signUp({
				email,
				password,
				options: {
					emailRedirectTo: window.location.origin,
					data: {
						gender,
						preferred_language: lang
					}
				}
			});
			if (err) setError(err.message);
			else if (!data.session) setInfo(tr.checkEmail);
		} else {
			const { error: err } = await supabase.auth.signInWithPassword({
				email,
				password
			});
			if (err) setError(err.message);
		}
		setBusy(false);
	}
	async function google() {
		setError(null);
		if (mode === "up") localStorage.setItem("chatora_pending_profile", JSON.stringify({
			gender,
			preferred_language: lang
		}));
		const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
		if (result.error) setError(result.error.message ?? String(result.error));
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen flex-col items-center justify-center bg-background px-5 py-12",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "w-full max-w-sm",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-8 text-center",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-primary text-2xl font-semibold text-primary-foreground",
						children: "C"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "text-2xl font-semibold tracking-tight text-foreground",
						children: tr.appName
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm text-muted-foreground",
						children: tr.tagline
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				onSubmit: submit,
				className: "space-y-4 rounded-3xl border border-border bg-card p-6 shadow-sm",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex rounded-2xl bg-muted p-1 text-sm",
						children: ["up", "in"].map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setMode(m),
							className: `flex-1 rounded-xl px-3 py-2 font-medium transition-colors ${mode === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`,
							children: m === "up" ? tr.signUp : tr.signIn
						}, m))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "block space-y-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-xs font-medium text-muted-foreground",
							children: tr.email
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "email",
							required: true,
							value: email,
							onChange: (e) => setEmail(e.target.value),
							className: "w-full rounded-2xl border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-ring"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "block space-y-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-xs font-medium text-muted-foreground",
							children: tr.password
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "relative",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: showPassword ? "text" : "password",
								required: true,
								minLength: 6,
								value: password,
								onChange: (e) => setPassword(e.target.value),
								className: "w-full rounded-2xl border border-input bg-background px-4 py-2.5 pe-12 text-sm text-foreground outline-none focus:border-ring"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => setShowPassword((v) => !v),
								"aria-label": showPassword ? tr.hidePassword : tr.showPassword,
								className: "absolute end-2 top-1/2 -translate-y-1/2 rounded-xl p-2 text-muted-foreground transition-colors hover:text-foreground",
								children: showPassword ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EyeOff, { className: "h-4 w-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, { className: "h-4 w-4" })
							})]
						})]
					}),
					mode === "up" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-xs font-medium text-muted-foreground",
							children: tr.gender
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex gap-2",
							children: ["male", "female"].map((g) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => setGender(g),
								className: `flex-1 rounded-2xl border px-3 py-2.5 text-sm font-medium transition-colors ${gender === g ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:bg-muted"}`,
								children: g === "male" ? tr.male : tr.female
							}, g))
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "block space-y-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-xs font-medium text-muted-foreground",
							children: tr.language
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
							value: lang,
							onChange: (e) => setLang(e.target.value),
							className: "w-full rounded-2xl border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-ring",
							children: LANGUAGES.map((l) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: l.code,
								children: l.label
							}, l.code))
						})]
					})] }),
					error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-destructive",
						children: error
					}),
					info && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted-foreground",
						children: info
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "submit",
						disabled: busy,
						className: "w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60",
						children: mode === "up" ? tr.createAccount : tr.signIn
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-3 text-xs text-muted-foreground",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "h-px flex-1 bg-border" }),
							tr.or,
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "h-px flex-1 bg-border" })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: google,
						disabled: busy,
						className: "flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-60",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-bold text-primary",
							children: "G"
						}), tr.google]
					})
				]
			})]
		})
	});
}
//#endregion
export { Landing as component };
