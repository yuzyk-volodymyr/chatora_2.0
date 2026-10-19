import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type Profile } from "@/hooks/useAuth";
import { t, applyDirection } from "@/lib/i18n";
import { CallProvider } from "@/lib/call";

export const Route = createFileRoute("/chats")({
  head: () => ({
    meta: [
      { title: "Your chats — Chatora" },
      { name: "description", content: "Your anonymous one-to-one conversations." },
      { property: "og:title", content: "Your chats — Chatora" },
      { property: "og:description", content: "Your anonymous one-to-one conversations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChatsLayout,
});

function ChatsLayout() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const tr = t(profile?.preferred_language);

  useEffect(() => {
    if (profile) applyDirection(profile.preferred_language);
  }, [profile]);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/", replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const raw = localStorage.getItem("chatora_pending_profile");
      if (raw) {
        localStorage.removeItem("chatora_pending_profile");
        try {
          const p = JSON.parse(raw) as { gender: string; preferred_language: string };
          await supabase
            .from("profiles")
            .update({ gender: p.gender, preferred_language: p.preferred_language })
            .eq("id", user.id);
        } catch {
          /* ignore */
        }
      }
      const { data } = await supabase
        .from("profiles")
        .select("id, user_number, gender, preferred_language, is_premium")
        .eq("id", user.id)
        .maybeSingle();
      setProfile(data as Profile | null);
    })();
  }, [user]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        {tr.loading}
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-dvh max-h-dvh w-full max-w-2xl flex-col overflow-hidden bg-background">
      <header className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <img
            src="/icon-192.png"
            alt={tr.appName}
            className="h-11 w-11 rounded-2xl"
          />
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{tr.appName}</p>
            <p className="text-base font-semibold text-foreground">
              {profile?.user_number ?? tr.loading}
            </p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="rounded-2xl border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
        >
          {tr.signOut}
        </button>
      </header>
      <CallProvider
        userId={user.id}
        myNumber={profile?.user_number ?? ""}
        lang={profile?.preferred_language ?? "ru"}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <Outlet />
        </div>
      </CallProvider>
    </div>
  );
}
