import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { LANGUAGES, t, applyDirection, type LangCode } from "@/lib/i18n";

export const Route = createFileRoute("/")({
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
  const tr = t(lang);

  useEffect(() => {
    applyDirection(lang);
  }, [lang]);
  useEffect(() => {
    if (!loading && session) navigate({ to: "/chats", replace: true });
  }, [loading, session, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    if (mode === "up") {
      const { data, error: err } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { gender, preferred_language: lang } },
      });
      if (err) setError(err.message);
      else if (!data.session) setError(tr.checkEmail);
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) setError(err.message);
    }
    setBusy(false);
  }

  return (
    // h-[100dvh] решает проблему с высотой экрана на телефонах
    <div className="flex h-[100dvh] w-full flex-col items-center justify-center bg-gradient-to-br from-[#7c3aed] via-[#3b82f6] to-[#ec4899] bg-[length:300%_300%] animate-gradient-bg px-4 py-8 overflow-y-auto">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-white/20 text-3xl font-semibold text-white backdrop-blur-md shadow-lg border border-white/30">
            C
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-md">
            {tr.appName}
          </h1>
          <p className="mt-2 text-sm text-white/80">{tr.tagline}</p>
        </div>

        <form
          onSubmit={submit}
          className="space-y-4 rounded-3xl border border-white/20 bg-black/40 p-6 shadow-2xl backdrop-blur-xl"
        >
          <div className="flex rounded-2xl bg-white/10 p-1 text-sm text-white">
            {(["up", "in"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 rounded-xl px-3 py-2 font-medium transition-colors ${mode === m ? "bg-white/20 text-white shadow-sm" : "text-white/60 hover:text-white"}`}
              >
                {m === "up" ? tr.signUp : tr.signIn}
              </button>
            ))}
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-white/80">{tr.email}</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-white/40 focus:bg-white/10"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-white/80">{tr.password}</span>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 pe-12 text-sm text-white placeholder-white/30 outline-none focus:border-white/40 focus:bg-white/10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute end-2 top-1/2 -translate-y-1/2 rounded-xl p-2 text-white/60 hover:text-white"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>

          {error && <p className="text-sm text-red-400 bg-red-400/10 p-2 rounded-lg">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-60"
          >
            {mode === "up" ? tr.createAccount : tr.signIn}
          </button>
        </form>
      </div>
    </div>
  );
}
