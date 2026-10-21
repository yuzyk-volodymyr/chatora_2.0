import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { LANGUAGES, t, applyDirection, type LangCode } from "@/lib/i18n";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Chatora — anonymous 1-to-1 messenger" },
      { name: "description", content: "Sign in to Chatora and chat one-to-one, anonymously." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<"in" | "up">("up");
  const [lang, setLang] = useState<LangCode>("ru");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const tr = t(lang);

  useEffect(() => {
    applyDirection(lang);
  }, [lang]);

  useEffect(() => {
    const inviteCode = new URLSearchParams(window.location.search).get("invite")?.replace(/\D/g, "");
    if (inviteCode) localStorage.setItem("chatora_invite_code", inviteCode);
  }, []);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/chats", replace: true });
  }, [loading, session, navigate]);

  async function submit(e: React.FormEvent) {
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
          data: { gender, preferred_language: lang },
        },
      });
      if (err) setError(err.message);
      else if (!data.session) setInfo(tr.checkEmail);
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) setError(err.message);
    }
    setBusy(false);
  }

  async function google() {
    setError(null);
    if (mode === "up") {
      localStorage.setItem("chatora_pending_profile", JSON.stringify({ gender, preferred_language: lang }));
    }
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) setError(result.error.message ?? String(result.error));
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-primary text-2xl font-semibold text-primary-foreground">
            C
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{tr.appName}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{tr.tagline}</p>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex rounded-2xl bg-muted p-1 text-sm">
            {(["up", "in"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 rounded-xl px-3 py-2 font-medium transition-colors ${
                  mode === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "up" ? tr.signUp : tr.signIn}
              </button>
            ))}
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">{tr.email}</span>
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-ring"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">{tr.password}</span>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"} required minLength={6} value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-input bg-background px-4 py-2.5 pe-12 text-sm text-foreground outline-none focus:border-ring"
              />
              <button
                type="button" onClick={() => setShowPassword((v) => !v)}
                className="absolute end-2 top-1/2 -translate-y-1/2 rounded-xl p-2 text-muted-foreground transition-colors hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>

          {mode === "up" && (
            <>
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">{tr.gender}</span>
                <div className="flex gap-2">
                  {(["male", "female"] as const).map((g) => (
                    <button
                      key={g} type="button" onClick={() => setGender(g)}
                      className={`flex-1 rounded-2xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                        gender === g ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:bg-muted"
                      }`}
                    >
                      {g === "male" ? tr.male : tr.female}
                    </button>
                  ))}
                </div>
              </div>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">{tr.language}</span>
                <select
                  value={lang} onChange={(e) => setLang(e.target.value as LangCode)}
                  className="w-full rounded-2xl border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-ring"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>{l.label}</option>
                  ))}
                </select>
              </label>
            </>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
          {info && <p className="text-sm text-muted-foreground">{info}</p>}

          <button
            type="submit" disabled={busy}
            className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {mode === "up" ? tr.createAccount : tr.signIn}
          </button>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            {tr.or}
            <span className="h-px flex-1 bg-border" />
          </div>

          <button
            type="button" onClick={google} disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-60"
          >
            <span className="font-bold text-primary">G</span>
            {tr.google}
          </button>
        </form>
      </div>
    </div>
  );
}