"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BUILT_IN } from "@/characters";
import { readShare } from "@/lib/engine";
import { publikStatus, type PublikState } from "@/lib/llm";
import { DEFAULT_SETTINGS, loadChats, loadCustom, loadSettings, saveChats, saveCustom, saveSettings, uid } from "@/lib/store";
import type { Character, Chat, Settings } from "@/lib/types";
import { AvatarStack } from "./Avatar";
import { ChatView } from "./ChatView";
import { Creator, Profile } from "./Creator";
import { CharacterGrid, Home } from "./Home";
import { SettingsDialog } from "./Settings";
import { Logo, Modal } from "./ui";

export const REPO_URL = "https://github.com/VedSoni-dev/salon";

export default function App() {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [publik, setPublik] = useState<PublikState | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [custom, setCustom] = useState<Character[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [creator, setCreator] = useState<{ initial?: Character } | null>(null);
  const [profile, setProfile] = useState<Character | null>(null);
  const [adding, setAdding] = useState<string[] | null>(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- reading browser storage once, after hydration */
    setSettings(loadSettings());
    const saved = loadChats();
    setChats(saved);
    try {
      const last = sessionStorage.getItem("salon:active");
      if (last && saved.some((c) => c.id === last)) setActiveId(last);
    } catch { /* private mode */ }
    const mine = loadCustom();
    const shared = readShare(location.hash);
    if (shared) {
      const c = { ...shared, id: `c-${uid()}`, custom: true };
      const next = [c, ...mine];
      setCustom(next);
      saveCustom(next);
      setProfile(c);
      history.replaceState(null, "", location.pathname);
    } else {
      setCustom(mine);
    }
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    publikStatus().then(setPublik).catch(() => setPublik({ available: false, connected: false, disclosure: "" }));
  }, []);

  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => saveChats(chats), 300);
    return () => clearTimeout(t);
  }, [chats, ready]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setActiveId(null); setDrawer(false); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { if (activeId) sessionStorage.setItem("salon:active", activeId); else sessionStorage.removeItem("salon:active"); } catch { /* private mode */ }
  }, [activeId, ready]);

  const roster = useMemo(() => [...custom, ...BUILT_IN], [custom]);
  const rosterMap = useMemo(() => new Map(roster.map((c) => [c.id, c])), [roster]);
  const active = chats.find((c) => c.id === activeId) ?? null;

  const updateSettings = (s: Settings) => { setSettings(s); saveSettings(s); };
  const updateChat = useCallback((c: Chat) => setChats((all) => [c, ...all.filter((x) => x.id !== c.id)]), []);
  const updateCustom = (next: Character[]) => { setCustom(next); saveCustom(next); };

  const startChat = (ids: string[]) => {
    const members = ids.filter((id) => rosterMap.has(id));
    if (!members.length) return;
    const existing = members.length === 1 && chats.find((c) => c.members.length === 1 && c.members[0] === members[0]);
    if (existing) { setActiveId(existing.id); setDrawer(false); return; }
    const now = Date.now();
    const solo = members.length === 1 ? rosterMap.get(members[0]) : null;
    const chat: Chat = {
      id: uid(), members, createdAt: now, updatedAt: now,
      messages: solo ? [{ id: uid(), from: solo.id, text: solo.greeting, at: now }] : [],
    };
    setChats((all) => [chat, ...all]);
    setActiveId(chat.id);
    setDrawer(false);
  };

  const addPeople = (ids: string[]) => {
    if (!active || !ids.length) return;
    const now = Date.now();
    const names = ids.map((id) => rosterMap.get(id)?.short).filter(Boolean).join(" and ");
    updateChat({
      ...active, members: [...active.members, ...ids], updatedAt: now,
      messages: [...active.messages, { id: uid(), from: "system", text: `${names} joined the chat`, at: now }],
    });
    setAdding(null);
  };

  const saveCharacter = (c: Character, chat: boolean) => {
    updateCustom([c, ...custom.filter((x) => x.id !== c.id)]);
    setCreator(null);
    if (chat) startChat([c.id]);
  };

  const deleteCharacter = (c: Character) => {
    if (!confirm(`Delete ${c.name}? Chats with them will lose their messages' avatar.`)) return;
    updateCustom(custom.filter((x) => x.id !== c.id));
    setProfile(null);
  };

  if (!ready) return <div className="h-dvh bg-bg" />;

  return (
    <div className="flex h-dvh overflow-hidden">
      {drawer && <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setDrawer(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-line bg-panel transition-transform md:static md:translate-x-0 ${drawer ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center gap-2 px-4 pb-3 pt-4">
          <button className="flex items-center gap-2" onClick={() => { setActiveId(null); setDrawer(false); }}>
            <Logo size={24} />
            <span className="font-display text-2xl leading-none">Salon</span>
          </button>
          <div className="flex-1" />
          <a href={REPO_URL} target="_blank" rel="noreferrer" className="btn btn-ghost px-2 text-mute" title="Open source on GitHub" aria-label="GitHub">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.3-3.4-1.3-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.6 2.4 1.1 3 .8.1-.7.4-1.1.6-1.4-2.2-.2-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.8 1a9.6 9.6 0 0 1 5 0c1.9-1.3 2.8-1 2.8-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.4 4.7-4.6 5 .4.3.7.9.7 1.9V21c0 .3.2.6.7.5A10 10 0 0 0 12 2z" /></svg>
          </a>
        </div>
        <div className="px-3">
          <button className="btn w-full justify-start" onClick={() => { setActiveId(null); setDrawer(false); }}>
            <span className="text-base leading-none">+</span> New chat <span className="kbd ml-auto">⌘K</span>
          </button>
        </div>
        <nav className="scroll-thin mt-3 flex-1 overflow-y-auto px-2" aria-label="Chats">
          {!chats.length && <p className="px-3 py-6 text-center text-xs leading-relaxed text-mute">Your chats show up here. They live in this browser only.</p>}
          {chats.map((c) => {
            const ms = c.members.map((id) => rosterMap.get(id)).filter(Boolean) as Character[];
            const last = [...c.messages].reverse().find((m) => m.from !== "system");
            const who = last ? (last.from === "user" ? "You: " : ms.length > 1 ? `${rosterMap.get(last.from)?.short ?? ""}: ` : "") : "";
            return (
              <button key={c.id} onClick={() => { setActiveId(c.id); setDrawer(false); }}
                className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition ${c.id === activeId ? "bg-sunk" : "hover:bg-sunk/70"}`}>
                <AvatarStack specs={ms.map((m) => m.avatar)} size={34} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{ms.length > 1 ? ms.map((m) => m.short).join(", ") : ms[0]?.name ?? "Missing character"}</div>
                  <div className="truncate text-xs text-mute">{last ? who + last.text : "No messages yet"}</div>
                </div>
              </button>
            );
          })}
        </nav>
        <div className="space-y-1 border-t border-line p-3">
          <button className="btn btn-ghost w-full justify-start" onClick={() => { setCreator({}); setDrawer(false); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            Make a character
          </button>
          <button className="btn btn-ghost w-full justify-start" onClick={() => setShowSettings(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>
            <span className="min-w-0 flex-1 truncate text-left">Settings</span>
            <span className="truncate text-xs font-normal text-mute">
              {settings.provider === "publik" ? (publik?.connected ? "publik API" : "Not set up") : settings.provider === "openai" ? "OpenAI key" : "Claude key"}
            </span>
          </button>
        </div>
      </aside>

      <main className="relative flex min-w-0 flex-1">
        {active ? (
          <ChatView
            key={active.id}
            chat={active}
            roster={rosterMap}
            settings={settings}
            publik={publik}
            onPublik={setPublik}
            onChange={updateChat}
            onDelete={() => { setChats((all) => all.filter((c) => c.id !== active.id)); setActiveId(null); }}
            onOpenSettings={() => setShowSettings(true)}
            onOpenMenu={() => setDrawer(true)}
            onAddPeople={() => setAdding([])}
            onViewCharacter={setProfile}
          />
        ) : (
          <Home roster={roster} onStart={startChat} onCreate={() => setCreator({})} onOpen={setProfile} onOpenMenu={() => setDrawer(true)} />
        )}
      </main>

      {showSettings && <SettingsDialog settings={settings} onChange={updateSettings} publik={publik} onPublik={setPublik} onClose={() => setShowSettings(false)} />}
      {creator && (
        <Creator initial={creator.initial} settings={settings} publik={publik} onPublik={setPublik} onSave={saveCharacter} onClose={() => setCreator(null)} onOpenSettings={() => setShowSettings(true)} />
      )}
      {profile && (
        <Profile
          c={profile}
          onClose={() => setProfile(null)}
          onChat={() => { setProfile(null); startChat([profile.id]); }}
          onEdit={() => { setProfile(null); setCreator({ initial: profile }); }}
          onRemix={() => { setProfile(null); setCreator({ initial: { ...profile, id: `c-${uid()}`, name: profile.name, custom: true } }); }}
          onDelete={() => deleteCharacter(profile)}
        />
      )}
      {adding && active && (
        <Modal title="Add people to this chat" onClose={() => setAdding(null)} wide>
          <CharacterGrid
            characters={roster}
            selected={adding}
            disabled={active.members}
            onToggle={(c) => setAdding((s) => (s ? (s.includes(c.id) ? s.filter((x) => x !== c.id) : [...s, c.id]) : s))}
          />
          <div className="sticky bottom-0 -mx-5 -mb-5 mt-4 flex justify-end gap-2 border-t border-line bg-panel px-5 py-3">
            <button className="btn" onClick={() => setAdding(null)}>Cancel</button>
            <button className="btn btn-primary" disabled={!adding.length} onClick={() => addPeople(adding)}>Add {adding.length || ""}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
