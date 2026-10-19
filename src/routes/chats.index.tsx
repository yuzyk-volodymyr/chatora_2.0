import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Check, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type Profile } from "@/hooks/useAuth";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/chats/")({
  component: PeopleList,
});

function PeopleList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [people, setPeople] = useState<Profile[]>([]);
  const [myLang, setMyLang] = useState<string>("ru");
  const [pending, setPending] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const inviteProcessed = useRef(false);
  const myNumber = people.find((p) => p.id === user?.id)?.user_number;
  const tr = t(myLang);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("id, user_number, gender, preferred_language, is_premium")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const rows = (data ?? []) as Profile[];
        const me = rows.find((p) => p.id === user.id);
        if (me) setMyLang(me.preferred_language);
        setPeople(rows);
      });
  }, [user]);

  useEffect(() => {
    if (!user || inviteProcessed.current) return;
    const inviteCode = localStorage.getItem("chatora_invite_code");
    if (!inviteCode) return;
    inviteProcessed.current = true;
    localStorage.removeItem("chatora_invite_code");
    void findAndOpen(inviteCode);
  }, [user]);

  async function openChat(otherId: string) {
    if (!user) return;
    setPending(otherId);
    const pair = [user.id, otherId].sort();
    const a = pair[0];
    const b = pair[1];
    if (!a || !b) return;
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("user_a", a)
      .eq("user_b", b)
      .maybeSingle();

    let id = existing?.id;
    if (!id) {
      const { data: created, error } = await supabase
        .from("conversations")
        .insert({ user_a: a, user_b: b })
        .select("id")
        .single();
      if (error) {
        setPending(null);
        return;
      }
      id = created.id;
    }
    navigate({ to: "/chats/$conversationId", params: { conversationId: id } });
  }

  async function findAndOpen(rawCode: string) {
    setSearchError(null);
    const digits = rawCode.replace(/\D/g, "");
    if (!digits) return;
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_number", `User#${digits}`)
      .maybeSingle();
    if (!data || data.id === user?.id) {
      setSearchError(tr.notFound);
      return;
    }
    openChat(data.id);
  }

  async function search(e: React.FormEvent) {
    e.preventDefault();
    await findAndOpen(code);
  }

  async function inviteUser() {
    if (!myNumber) return;
    const digits = myNumber.replace(/\D/g, "");
    const url = `${window.location.origin}/?invite=${digits}`;
    const text = `${tr.inviteMessage} ${url}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: tr.appName, text, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    await navigator.clipboard.writeText(text);
    setInviteCopied(true);
    window.setTimeout(() => setInviteCopied(false), 2500);
  }

  return (
    <main className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
      <form onSubmit={search} className="mb-6 flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={tr.searchCode}
          inputMode="numeric"
          className="flex-1 rounded-2xl border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-ring"
        />
        <button
          type="submit"
          className="rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          {tr.find}
        </button>
      </form>
      {searchError && <p className="-mt-4 mb-4 text-sm text-destructive">{searchError}</p>}
      <Button
        type="button"
        variant="outline"
        onClick={inviteUser}
        disabled={!myNumber}
        className="mb-6 w-full justify-center gap-2"
      >
        {inviteCopied ? <Check className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
        {inviteCopied ? tr.inviteCopied : tr.invite}
      </Button>
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {tr.chats}
      </h2>
      {people.length === 0 ? (
        <p className="text-sm text-muted-foreground">{tr.noPeople}</p>
      ) : (
        <ul className="space-y-2">
          {people.filter((p) => p.id !== user?.id).map((p) => (
            <li key={p.id}>
              <button
                onClick={() => openChat(p.id)}
                disabled={pending === p.id}
                className="flex w-full items-center gap-3 rounded-3xl border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-muted disabled:opacity-60"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-sm font-semibold text-secondary-foreground">
                  {p.gender === "female" ? "♀" : "♂"}
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-medium text-foreground">{p.user_number}</span>
                  <span className="block text-xs text-muted-foreground">
                    {p.preferred_language.toUpperCase()}
                  </span>
                </span>
                <span className="text-xs font-medium text-primary">{tr.openChat}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
