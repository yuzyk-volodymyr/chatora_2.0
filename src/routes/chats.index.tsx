import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UserPlus, Check, Pencil } from "lucide-react";
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
  const [aliases, setAliases] = useState<Record<string, string>>({});
  const [myLang, setMyLang] = useState<string>("ru");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const tr = t(myLang);

  useEffect(() => {
    if (!user) return;

    // Загрузка профилей
    supabase.from("profiles").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      const rows = (data ?? []) as Profile[];
      setPeople(rows);
      const me = rows.find(p => p.id === user.id);
      if (me) setMyLang(me.preferred_language);
    });

    // Загрузка кастомных имен
    supabase.from("contact_aliases").select("contact_id, alias").eq("owner_id", user.id).then(({ data }) => {
      const map: Record<string, string> = {};
      data?.forEach(a => map[a.contact_id] = a.alias);
      setAliases(map);
    });
  }, [user]);

  async function openChat(otherId: string) {
    if (!user) return;
    setPending(otherId);
    const pair = [user.id, otherId].sort();
    const a = pair[0];
    const b = pair[1];

    const { data: existing } = await supabase.from("conversations").select("id").eq("user_a", a).eq("user_b", b).maybeSingle();
    let id = existing?.id;
    
    if (!id) {
      const { data: created } = await supabase.from("conversations").insert({ user_a: a, user_b: b }).select("id").single();
      id = created?.id;
    }
    navigate({ to: "/chats/$conversationId", params: { conversationId: id! } });
  }

  async function search(e: React.FormEvent) {
    e.preventDefault();
    const digits = code.replace(/\D/g, "");
    if (!digits) return;
    const { data } = await supabase.from("profiles").select("id").eq("user_number", `User#${digits}`).maybeSingle();
    if (!data || data.id === user?.id) setSearchError(tr.notFound);
    else openChat(data.id);
  }

  async function renameContact(e: React.MouseEvent, contactId: string, currentName: string) {
    e.stopPropagation();
    const newName = window.prompt("Введите новое имя:", currentName);
    if (newName && newName.trim() && newName.trim() !== currentName) {
      await supabase.from("contact_aliases").upsert({ owner_id: user?.id, contact_id: contactId, alias: newName.trim() });
      setAliases(prev => ({ ...prev, [contactId]: newName.trim() }));
    }
  }

  async function inviteUser() {
    const me = people.find(p => p.id === user?.id);
    if (!me) return;
    const url = `${window.location.origin}/?invite=${me.user_number.replace(/\D/g, "")}`;
    if (navigator.share) {
      try { await navigator.share({ title: tr.appName, text: tr.inviteMessage, url }); return; } catch (e) {}
    }
    await navigator.clipboard.writeText(url);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2000);
  }

  return (
    <main className="flex h-[100dvh] w-full flex-col overflow-y-auto bg-[#0a0a0a] px-5 py-6">
      <form onSubmit={search} className="mb-4 flex gap-2 w-full">
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder={tr.searchCode} inputMode="numeric" className="min-w-0 flex-1 rounded-2xl border border-zinc-800 bg-[#18181b] px-4 py-2.5 text-sm text-white outline-none" />
        <button type="submit" className="rounded-2xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white">{tr.find}</button>
      </form>

      <button onClick={inviteUser} className="mb-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-800 py-3 text-sm text-zinc-300">
        {inviteCopied ? <Check className="h-4 w-4 text-green-500" /> : <UserPlus className="h-4 w-4" />}
        {inviteCopied ? "Скопировано!" : tr.invite}
      </button>

      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">{tr.chats}</h2>
      <ul className="space-y-2 pb-10">
        {people.filter(p => p.id !== user?.id).map(p => {
          const displayName = aliases[p.id] || p.user_number;
          return (
            <li key={p.id}>
              <div onClick={() => !pending && openChat(p.id)} className="flex w-full items-center gap-3 rounded-3xl border border-zinc-800/50 bg-[#1f1f22] px-4 py-3 cursor-pointer hover:bg-zinc-800/80">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-800 text-sm font-bold text-purple-400">{displayName.charAt(0).toUpperCase()}</span>
                <span className="flex-1 min-w-0">
                  <span className="block truncate text-sm font-medium text-white">{displayName}</span>
                  {aliases[p.id] && <span className="block text-xs text-zinc-500 truncate">{p.user_number}</span>}
                </span>
                <button onClick={(e) => renameContact(e, p.id, displayName)} className="p-2 text-zinc-500 hover:text-white"><Pencil className="h-4 w-4" /></button>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}