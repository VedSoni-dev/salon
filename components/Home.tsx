"use client";

import { useMemo, useState } from "react";
import { PRESETS } from "@/lib/presets";
import type { Character } from "@/lib/types";
import { Avatar } from "./Avatar";

const KIND_LABEL = { historical: "History", living: "Public figure", original: "Original" } as const;

export function CharacterGrid({ characters, selected, onToggle, onCreate, onOpen, disabled }: {
  characters: Character[];
  selected: string[];
  onToggle: (c: Character) => void;
  onCreate?: () => void;
  onOpen?: (c: Character) => void;
  disabled?: string[];
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
      {onCreate && (
        <button onClick={onCreate} className="group flex min-h-[148px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line p-4 text-center transition hover:border-accent">
          <span className="grid size-12 place-items-center rounded-full bg-accent/10 text-2xl text-accent transition group-hover:scale-105">+</span>
          <span className="text-sm font-semibold">Make anyone</span>
          <span className="text-xs text-mute">Describe a person, get a character</span>
        </button>
      )}
      {characters.map((c) => {
        const on = selected.includes(c.id);
        const off = disabled?.includes(c.id);
        return (
          <div key={c.id} className={`relative rounded-2xl border bg-panel transition ${on ? "border-accent ring-2 ring-accent/25" : "border-line hover:border-mute"} ${off ? "opacity-40" : ""}`}>
            <button className={`flex w-full flex-col items-center gap-2 p-4 text-center ${onOpen ? "pb-7" : "pb-3"}`} onClick={() => !off && onToggle(c)} aria-pressed={on} disabled={off}>
              <Avatar spec={c.avatar} size={64} />
              <span className="mt-0.5 line-clamp-1 text-sm font-semibold">{c.name}</span>
              <span className="line-clamp-2 min-h-[2.4em] text-xs leading-snug text-mute">{c.tagline}</span>
            </button>
            <span className={`pointer-events-none absolute right-2.5 top-2.5 grid size-5 place-items-center rounded-full border text-[11px] transition ${on ? "border-accent bg-accent text-accent-fg" : "border-line bg-bg text-transparent"}`}>✓</span>
            <span className="pointer-events-none absolute left-2.5 top-2.5 text-[10px] font-medium uppercase tracking-wide text-mute">{c.custom ? "Yours" : KIND_LABEL[c.kind]}</span>
            {onOpen && (
              <button className="absolute bottom-1.5 left-1/2 -translate-x-1/2 rounded-md px-2 py-0.5 text-[11px] text-mute hover:bg-sunk hover:text-fg" onClick={() => onOpen(c)}>About</button>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function Home({ roster, onStart, onCreate, onOpen, onOpenMenu }: {
  roster: Character[];
  onStart: (ids: string[]) => void;
  onCreate: () => void;
  onOpen: (c: Character) => void;
  onOpenMenu: () => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const byId = useMemo(() => new Map(roster.map((c) => [c.id, c])), [roster]);
  const shown = roster.filter((c) => !q.trim() || `${c.name} ${c.tagline} ${c.short}`.toLowerCase().includes(q.trim().toLowerCase()));
  const toggle = (c: Character) => setSelected((s) => (s.includes(c.id) ? s.filter((x) => x !== c.id) : s.length >= 6 ? s : [...s, c.id]));
  const picked = selected.map((id) => byId.get(id)).filter(Boolean) as Character[];

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col">
      <div className="flex items-center gap-2 px-3 pt-3 md:hidden">
        <button className="btn btn-ghost px-2" onClick={onOpenMenu} aria-label="Open chats">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h10" /></svg>
        </button>
      </div>
      <div className="scroll-thin flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-4 pb-32 pt-6 sm:px-8 sm:pt-12">
          <h1 className="font-display text-[2.6rem] leading-[1.02] sm:text-6xl">Who&apos;s in your<br className="sm:hidden" /> group chat?</h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-mute">
            Talk one-on-one with anyone, or throw Einstein and Joe Rogan in a group chat and watch what happens. Free and open source. Make your own characters in one sentence.
          </p>

          <div className="mt-7 flex snap-x gap-3 overflow-x-auto pb-2 scroll-thin">
            {PRESETS.map((p) => {
              const cs = p.members.map((id) => byId.get(id)).filter(Boolean) as Character[];
              if (cs.length !== p.members.length) return null;
              return (
                <button key={p.title} onClick={() => onStart(p.members)} className="group flex w-60 flex-none snap-start flex-col rounded-2xl border border-line bg-panel p-4 text-left transition hover:-translate-y-0.5 hover:border-accent hover:shadow-[var(--shadow)]">
                  <div className="flex -space-x-3">
                    {cs.map((c) => <div key={c.id} className="rounded-full ring-[3px] ring-[var(--panel)]"><Avatar spec={c.avatar} size={46} /></div>)}
                  </div>
                  <div className="mt-3 text-sm font-semibold">{cs.map((c) => c.short).join(" × ")}</div>
                  <div className="text-xs text-mute">{p.title}</div>
                  <div className="mt-3 text-xs font-medium text-accent opacity-0 transition group-hover:opacity-100">Open the chat →</div>
                </button>
              );
            })}
          </div>

          <div className="mb-3 mt-10 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Pick your people</h2>
              <p className="text-sm text-mute">One for a private chat. Two or more for a group chat.</p>
            </div>
            <input className="field w-full sm:w-60" placeholder="Search characters" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search characters" />
          </div>
          <CharacterGrid characters={shown} selected={selected} onToggle={toggle} onCreate={q ? undefined : onCreate} onOpen={onOpen} />
          {!shown.length && (
            <div className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-mute">
              Nobody called &ldquo;{q}&rdquo; yet. <button className="font-semibold text-accent underline-offset-2 hover:underline" onClick={onCreate}>Make them</button>
            </div>
          )}
        </div>
      </div>

      {picked.length > 0 && (
        <div className="rise pointer-events-none absolute inset-x-0 bottom-0 flex justify-center px-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="pointer-events-auto flex w-full max-w-lg items-center gap-3 rounded-2xl border border-line bg-panel p-2.5 pl-3 shadow-[var(--shadow)]">
            <div className="flex -space-x-2.5">{picked.map((c) => <div key={c.id} className="rounded-full ring-2 ring-[var(--panel)]"><Avatar spec={c.avatar} size={32} /></div>)}</div>
            <div className="min-w-0 flex-1 truncate text-sm">{picked.map((c) => c.short).join(", ")}</div>
            <button className="btn btn-ghost px-2 text-mute" onClick={() => setSelected([])} aria-label="Clear selection">✕</button>
            <button className="btn btn-primary" onClick={() => onStart(selected)}>{picked.length > 1 ? "Start group chat" : `Chat with ${picked[0].short}`}</button>
          </div>
        </div>
      )}
    </div>
  );
}
