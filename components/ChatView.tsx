"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { buildMessages, cleanReply, directorMessages, nextAuto, parseDirector, quickSpeakers, userLabel } from "@/lib/engine";
import { complete, LLMError, publikConnect, streamChat, type PublikState } from "@/lib/llm";
import { DM_STARTERS, GROUP_STARTERS, PRESETS } from "@/lib/presets";
import { uid } from "@/lib/store";
import type { Character, Chat, Settings } from "@/lib/types";
import { Avatar, AvatarStack, shade } from "./Avatar";
import { ErrorBanner, Menu, MenuItem } from "./ui";

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((res) => {
    const t = setTimeout(res, ms);
    signal.addEventListener("abort", () => { clearTimeout(t); res(); }, { once: true });
  });

export function ChatView({ chat, roster, settings, publik, onPublik, onChange, onDelete, onOpenSettings, onOpenMenu, onAddPeople, onViewCharacter }: {
  chat: Chat;
  roster: Map<string, Character>;
  settings: Settings;
  publik: PublikState | null;
  onPublik: (p: PublikState) => void;
  onChange: (c: Chat) => void;
  onDelete: () => void;
  onOpenSettings: () => void;
  onOpenMenu: () => void;
  onAddPeople: () => void;
  onViewCharacter: (c: Character) => void;
}) {
  const members = useMemo(() => chat.members.map((id) => roster.get(id)).filter(Boolean) as Character[], [chat.members, roster]);
  const group = members.length > 1;
  const you = userLabel(settings.userName);

  // The newest copy of this chat, readable mid-stream. App keys this view by chat id, so the id never changes here.
  const live = useRef(chat);
  useEffect(() => {
    if (chat.updatedAt > live.current.updatedAt) live.current = chat;
  }, [chat]);
  const mutate = useCallback((fn: (c: Chat) => Chat) => {
    live.current = { ...fn(live.current), updatedAt: Date.now() };
    onChange(live.current);
  }, [onChange]);

  const [busy, setBusy] = useState(false);
  const [auto, setAuto] = useState(false);
  const [typing, setTyping] = useState<Character[] | null>(null);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const [retry, setRetry] = useState<(() => void) | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);

  // Leaving a chat stops whatever was being said in it.
  useEffect(() => {
    input.current?.focus();
    return () => abort.current?.abort();
  }, []);

  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && pinned.current) el.scrollTop = el.scrollHeight;
  }, [chat.messages, typing]);

  const needsSetup = settings.provider === "publik" && !!publik && !publik.connected;

  const speak = async (c: Character, signal: AbortSignal, autoTurn: boolean) => {
    setTyping([c]);
    const messages = buildMessages(c, live.current, roster, settings.userName, autoTurn);
    const id = uid();
    let raw = "";
    let started = false;
    try {
      await streamChat({
        messages, settings, signal, maxTokens: 450, temperature: 0.95,
        onDelta: (t) => {
          raw += t;
          const text = cleanReply(raw, c, members);
          if (!text.trim()) return;
          if (!started) {
            started = true;
            setTyping(null);
            setStreamingId(id);
            mutate((ch) => ({ ...ch, messages: [...ch.messages, { id, from: c.id, text, at: Date.now() }] }));
          } else {
            mutate((ch) => ({ ...ch, messages: ch.messages.map((m) => (m.id === id ? { ...m, text } : m)) }));
          }
        },
      });
    } finally {
      setStreamingId(null);
      setTyping(null);
      if (started) {
        const text = cleanReply(raw, c, members).trim();
        mutate((ch) => ({ ...ch, messages: ch.messages.map((m) => (m.id === id ? { ...m, text } : m)) }));
      }
    }
  };

  const run = async (fn: (signal: AbortSignal) => Promise<void>, again: () => void) => {
    const ac = new AbortController();
    abort.current = ac;
    setRetry(() => again);
    setBusy(true);
    setError(null);
    try {
      await fn(ac.signal);
    } catch (e) {
      if (!ac.signal.aborted && (e as Error)?.name !== "AbortError") setError(e as Error);
    } finally {
      if (abort.current === ac) abort.current = null;
      setBusy(false);
      setAuto(false);
      setTyping(null);
    }
  };

  const respond = (text: string) =>
    run(async (signal) => {
      let speakers = quickSpeakers(text, members);
      if (!speakers) {
        setTyping(members.slice(0, 3));
        try {
          const fast: Settings = { ...settings, publikTier: "publik-fast" };
          const out = await complete({ messages: directorMessages(live.current, members, roster, settings.userName), settings: fast, signal, maxTokens: 60, temperature: 0.4 });
          speakers = parseDirector(out, members);
        } catch (e) {
          if (signal.aborted || e instanceof LLMError) throw e;
        }
        if (!speakers?.length) speakers = [...members].sort(() => Math.random() - 0.5).slice(0, 2);
      }
      for (let i = 0; i < speakers.length && !signal.aborted; i++) {
        if (i) await sleep(350, signal);
        await speak(speakers[i], signal, false);
      }
    }, () => respond(text));

  const send = (raw?: string) => {
    const text = (raw ?? draft).trim();
    if (!text || busy) return;
    if (needsSetup) { setPending(text); setDraft(text); return; }
    setDraft("");
    pinned.current = true;
    mutate((c) => ({ ...c, messages: [...c.messages, { id: uid(), from: "user", text, at: Date.now() }] }));
    respond(text);
  };

  const letThemTalk = () => {
    pinned.current = true;
    setAuto(true);
    run(async (signal) => {
      for (let i = 0; i < 4 && !signal.aborted; i++) {
        if (i) await sleep(500, signal);
        await speak(nextAuto(live.current, members), signal, true);
      }
    }, letThemTalk);
  };

  const connectAndSend = async () => {
    setConnecting(true);
    setError(null);
    try {
      const state = await publikConnect();
      onPublik(state);
      const text = pending;
      setPending(null);
      if (text) {
        setDraft("");
        mutate((c) => ({ ...c, messages: [...c.messages, { id: uid(), from: "user", text, at: Date.now() }] }));
        // The fresh cookie is already set; publik state in this closure is stale, so go straight to responding.
        respond(text);
      }
    } catch (e) {
      setError(e as Error);
    }
    setConnecting(false);
  };

  const stop = () => abort.current?.abort();

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape" && abort.current) abort.current.abort(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  const preset = PRESETS.find((p) => p.members.length === chat.members.length && p.members.every((m) => chat.members.includes(m)));
  const starters = preset?.starters ?? (group ? GROUP_STARTERS : DM_STARTERS);
  const fresh = !chat.messages.some((m) => m.from === "user");
  const living = members.filter((m) => m.kind === "living");
  const title = group ? members.map((m) => m.short).join(", ") : members[0]?.name ?? "Chat";

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col">
      <header className="flex items-center gap-3 border-b border-line bg-panel/80 px-3 py-2.5 backdrop-blur sm:px-5">
        <div className="-ml-1 md:hidden">
          <button className="btn btn-ghost px-2" onClick={onOpenMenu} aria-label="Open chats">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h10" /></svg>
          </button>
        </div>
        <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => !group && members[0] && onViewCharacter(members[0])} disabled={group}>
          {group ? <AvatarStack specs={members.map((m) => m.avatar)} size={36} /> : members[0] && <Avatar spec={members[0].avatar} size={38} />}
          <div className="min-w-0">
            <div className="truncate font-semibold leading-tight">{title}</div>
            <div className="truncate text-xs text-mute">
              {group ? `${members.length + 1} people · ${you} + ${members.length} AI characters` : `${members[0]?.tagline ?? ""}`}
            </div>
          </div>
        </button>
        <div className="hidden sm:block">
          <button className="btn" onClick={onAddPeople} title="Add someone to this chat">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="9" cy="8" r="4" /><path d="M2 21c0-3.9 3.1-7 7-7s7 3.1 7 7M19 8v6M16 11h6" /></svg>
            Add people
          </button>
        </div>
        <Menu label={<span aria-hidden>⋯</span>} className="btn btn-ghost px-2.5 text-lg" title="Chat options">
          {(close) => (
            <>
              <MenuItem onClick={() => { close(); onAddPeople(); }}>Add people</MenuItem>
              {members.map((m) => <MenuItem key={m.id} onClick={() => { close(); onViewCharacter(m); }}>About {m.short}</MenuItem>)}
              <MenuItem onClick={() => { close(); stop(); mutate((c) => ({ ...c, messages: group ? [] : c.messages.slice(0, 1).filter((m) => m.from !== "user") })); }}>Clear messages</MenuItem>
              <MenuItem danger onClick={() => { close(); stop(); onDelete(); }}>Delete chat</MenuItem>
            </>
          )}
        </Menu>
      </header>

      <div ref={scroller} className="scroll-thin flex-1 overflow-y-auto" onScroll={(e) => { const el = e.currentTarget; pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }}>
        <div className="mx-auto flex max-w-3xl flex-col gap-1 px-3 pb-6 pt-6 sm:px-6">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-3 flex -space-x-3">
              {members.map((m) => <div key={m.id} className="rounded-full ring-4 ring-[var(--bg)]"><Avatar spec={m.avatar} size={group ? 56 : 72} /></div>)}
            </div>
            <div className="font-display text-2xl">{group ? (preset?.title ?? "Group chat") : members[0]?.name}</div>
            <p className="mt-1 max-w-md text-sm text-mute">
              {group ? `You, ${members.map((m) => m.short).join(", ").replace(/, ([^,]*)$/, " and $1")}.` : members[0]?.tagline}
            </p>
            <p className="mt-2 max-w-md text-xs text-mute">
              AI portrayals, made for fun.{living.length ? ` ${living.map((l) => l.name).join(" and ")} ${living.length > 1 ? "are" : "is"} an AI impression, not the real person.` : ""}
            </p>
          </div>

          {chat.messages.map((m, i) => {
            if (m.from === "system") return <div key={m.id} className="my-2 text-center text-xs text-mute">{m.text}</div>;
            const prev = chat.messages[i - 1];
            const first = !prev || prev.from !== m.from;
            if (m.from === "user") {
              return (
                <div key={m.id} className={`bubble-in flex justify-end ${first ? "mt-3" : ""}`}>
                  <div className="max-w-[82%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-accent px-3.5 py-2 text-[15px] leading-relaxed text-accent-fg">{m.text}</div>
                </div>
              );
            }
            const c = roster.get(m.from);
            const color = c ? `color-mix(in srgb, ${shade(c.avatar.bg, 0.1)} 75%, var(--fg))` : "var(--mute)";
            return (
              <div key={m.id} className={`bubble-in flex items-end gap-2.5 ${first ? "mt-3" : ""}`}>
                <div className="w-9 flex-none">
                  {(chat.messages[i + 1]?.from !== m.from) && c && (
                    <button onClick={() => onViewCharacter(c)} aria-label={`About ${c.name}`}><Avatar spec={c.avatar} size={36} /></button>
                  )}
                </div>
                <div className="min-w-0 max-w-[82%]">
                  {first && group && <div className="mb-0.5 ml-1 text-xs font-semibold" style={{ color }}>{c?.short ?? "Someone"}</div>}
                  <div className={`whitespace-pre-wrap break-words rounded-2xl rounded-bl-md border border-line bg-panel px-3.5 py-2 text-[15px] leading-relaxed ${streamingId === m.id ? "caret" : ""}`}>{m.text}</div>
                </div>
              </div>
            );
          })}

          {typing && (
            <div className="bubble-in mt-3 flex items-end gap-2.5" aria-live="polite">
              <div className="bob w-9 flex-none">{typing.length === 1 ? <Avatar spec={typing[0].avatar} size={36} /> : <AvatarStack specs={typing.map((t) => t.avatar)} size={26} />}</div>
              <div className="rounded-2xl rounded-bl-md border border-line bg-panel px-3.5 py-2.5 text-mute">
                <span className="sr-only">{typing.length === 1 ? `${typing[0].short} is typing` : "Someone is about to reply"}</span>
                <span className="dots" aria-hidden><span /><span /><span /></span>
              </div>
              <span className="mb-2 text-xs text-mute">{typing.length === 1 ? `${typing[0].short} is typing` : "…"}</span>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-line bg-bg px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-6">
        <div className="mx-auto max-w-3xl">
          {error && (
            <div className="mb-3">
              <ErrorBanner error={error} onDismiss={() => setError(null)} onSettings={onOpenSettings} onRetry={retry ?? undefined} />
            </div>
          )}

          {pending && needsSetup && (
            <div className="rise mb-3 rounded-2xl border border-accent/40 bg-panel p-4 text-sm">
              {publik?.available ? (
                <>
                  <div className="mb-1 font-semibold">One step before {group ? "they" : members[0]?.short} can reply</div>
                  <p className="mb-3 leading-relaxed text-mute">{publik.disclosure}</p>
                  <div className="flex flex-wrap gap-2">
                    <button className="btn btn-primary" disabled={connecting} onClick={connectAndSend}>{connecting ? "Setting up…" : "Turn on publik API and send"}</button>
                    <button className="btn" onClick={onOpenSettings}>Use my own key</button>
                    <button className="btn btn-ghost" onClick={() => setPending(null)}>Cancel</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-1 font-semibold">Add a key to start chatting</div>
                  <p className="mb-3 leading-relaxed text-mute">This copy of Salon doesn&apos;t have publik API switched on. Paste your own OpenAI or Anthropic key in Settings; it stays in your browser.</p>
                  <div className="flex gap-2"><button className="btn btn-primary" onClick={onOpenSettings}>Open settings</button><button className="btn btn-ghost" onClick={() => setPending(null)}>Cancel</button></div>
                </>
              )}
            </div>
          )}

          {fresh && !busy && !pending && (
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1 scroll-thin">
              {starters.map((s) => <button key={s} className="chip" onClick={() => send(s)}>{s}</button>)}
            </div>
          )}

          <div className="flex items-end gap-2">
            <div className="flex min-w-0 flex-1 items-end rounded-2xl border border-line bg-panel pl-3.5 pr-1.5 focus-within:border-accent">
              <textarea
                ref={input}
                rows={1}
                value={draft}
                onChange={(e) => { setDraft(e.target.value); e.currentTarget.style.height = "auto"; e.currentTarget.style.height = `${Math.min(e.currentTarget.scrollHeight, 160)}px`; }}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }}
                placeholder={group ? `Message the group… (@name to ask someone)` : `Message ${members[0]?.short ?? ""}…`}
                className="max-h-40 min-h-[2.75rem] flex-1 resize-none bg-transparent py-2.5 text-[15px] leading-relaxed outline-none placeholder:text-mute"
                aria-label="Message"
              />
              {busy ? (
                <button className="btn my-1 h-9 w-9 rounded-xl p-0" onClick={stop} aria-label="Stop" title="Stop (Esc)">
                  <svg width="12" height="12" viewBox="0 0 12 12"><rect width="12" height="12" rx="2" fill="currentColor" /></svg>
                </button>
              ) : (
                <button className="btn btn-primary my-1 h-9 w-9 rounded-xl p-0" onClick={() => send()} disabled={!draft.trim()} aria-label="Send">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
                </button>
              )}
            </div>
            {group && (
              <button
                className={`btn h-[2.75rem] rounded-2xl ${auto ? "border-accent text-accent" : ""}`}
                onClick={auto ? stop : letThemTalk}
                disabled={busy && !auto}
                title="The characters keep talking among themselves"
              >
                {auto ? (
                  <><span className="dots text-accent" aria-hidden><span /><span /><span /></span> Stop</>
                ) : (
                  <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12z" /><path d="M8.5 12h.01M12 12h.01M15.5 12h.01" /></svg><span className="hidden sm:inline">Let them talk</span></>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
