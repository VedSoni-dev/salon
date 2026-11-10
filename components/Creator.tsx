"use client";

import { useState } from "react";
import { creatorMessages, parseJSONObject, sanitize, shareUrl, slugify } from "@/lib/engine";
import { complete, publikConnect, type PublikState } from "@/lib/llm";
import { uid } from "@/lib/store";
import { KINDS, OPTIONS, type AvatarSpec, type Character, type Settings } from "@/lib/types";
import { Avatar } from "./Avatar";
import { ErrorBanner, Modal } from "./ui";

const IDEAS = ["Bob Ross", "Cleopatra's cat", "a 1920s noir detective", "Marcus Aurelius", "my overly honest personal trainer", "Isaac Newton, very petty"];

const LOOK: { key: keyof typeof OPTIONS; label: string }[] = [
  { key: "hair", label: "Hair" },
  { key: "facial", label: "Facial hair" },
  { key: "brows", label: "Brows" },
  { key: "glasses", label: "Glasses" },
  { key: "outfit", label: "Outfit" },
  { key: "accessory", label: "Extra" },
];
const COLORS: { key: keyof AvatarSpec; label: string }[] = [
  { key: "skin", label: "Skin" },
  { key: "hairColor", label: "Hair" },
  { key: "facialColor", label: "Beard" },
  { key: "outfitColor", label: "Outfit" },
  { key: "bg", label: "Backdrop" },
];
const SKINS = ["#f6dcc8", "#f1c9a5", "#e2b48e", "#c98f66", "#a86f4c", "#7a4b31", "#4e2f20"];

const BLANK = (): Character => sanitize({ name: "New character", short: "New", tagline: "", kind: "original", greeting: "Hey! What's on your mind?" }, `c-${uid()}`);

export function Creator({ initial, settings, publik, onPublik, onSave, onClose, onOpenSettings }: {
  initial?: Character;
  settings: Settings;
  publik: PublikState | null;
  onPublik: (p: PublikState) => void;
  onSave: (c: Character, chat: boolean) => void;
  onClose: () => void;
  onOpenSettings: () => void;
}) {
  const [draft, setDraft] = useState<Character | null>(initial ?? null);
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [paste, setPaste] = useState("");
  const needsSetup = settings.provider === "publik" && !!publik && !publik.connected;

  const generate = async (text = desc) => {
    const who = text.trim();
    if (!who || busy) return;
    setDesc(who);
    setBusy(true);
    setError(null);
    try {
      if (needsSetup) {
        if (!publik?.available) { onOpenSettings(); throw new Error("Add your own OpenAI or Anthropic key in Settings to make characters."); }
        onPublik(await publikConnect());
      }
      const out = await complete({ messages: creatorMessages(who), settings, maxTokens: 1400, temperature: 0.7 });
      setDraft({ ...sanitize(parseJSONObject(out), `c-${uid()}`), custom: true });
    } catch (e) {
      setError(e as Error);
    }
    setBusy(false);
  };

  const set = (p: Partial<Character>) => draft && setDraft({ ...draft, ...p });
  const setLook = (p: Partial<AvatarSpec>) => draft && setDraft({ ...draft, avatar: { ...draft.avatar, ...p } });

  const importJSON = () => {
    try {
      setDraft({ ...sanitize(JSON.parse(paste), `c-${uid()}`), custom: true });
      setError(null);
    } catch (e) {
      setError(new Error(e instanceof SyntaxError ? "That isn't valid JSON." : (e as Error).message));
    }
  };

  if (!draft) {
    return (
      <Modal title="Make a character" onClose={onClose}>
        <p className="mb-3 text-sm text-mute">Anyone, real or made up. One line is enough; Salon writes their personality, voice and look.</p>
        <form onSubmit={(e) => { e.preventDefault(); generate(); }}>
          <textarea
            autoFocus
            className="field min-h-24 text-[15px]"
            placeholder="e.g. Bob Ross, but he's secretly competitive"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); generate(); } }}
            maxLength={500}
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {IDEAS.map((i) => <button type="button" key={i} className="chip" onClick={() => setDesc(i)}>{i}</button>)}
          </div>
          {needsSetup && publik?.available && <p className="mt-4 rounded-xl border border-line bg-sunk p-3 text-xs leading-relaxed text-mute">{publik.disclosure}</p>}
          {error && <div className="mt-3"><ErrorBanner error={error} onDismiss={() => setError(null)} onSettings={onOpenSettings} onRetry={() => generate()} /></div>}
          <button className="btn btn-primary mt-4 w-full" disabled={busy || !desc.trim()}>
            {busy ? <><span className="dots" aria-hidden><span /><span /><span /></span> Writing their personality…</> : needsSetup && publik?.available ? "Turn on publik API and make them" : "Make them"}
          </button>
        </form>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-mute">
          <button className="underline underline-offset-2" onClick={() => setDraft({ ...BLANK(), custom: true })}>Start from a blank character</button>
          <details className="w-full">
            <summary className="cursor-pointer">Paste a character file</summary>
            <textarea className="field mt-2 min-h-24 font-mono text-xs" placeholder='{"name": "…", "persona": "…"}' value={paste} onChange={(e) => setPaste(e.target.value)} />
            <button className="btn mt-2" disabled={!paste.trim()} onClick={importJSON}>Import</button>
          </details>
        </div>
      </Modal>
    );
  }

  const valid = draft.name.trim() && draft.persona.trim();
  return (
    <Modal title={initial ? `Edit ${initial.short}` : "Your character"} onClose={onClose} wide>
      <div className="grid gap-5 sm:grid-cols-[220px_1fr]">
        <div>
          <div className="flex justify-center"><Avatar spec={draft.avatar} size={168} /></div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {LOOK.map(({ key, label }) => (
              <label key={key} className="block">
                <span className="mb-0.5 block text-[11px] text-mute">{label}</span>
                <select className="field h-8 px-2 text-xs" value={draft.avatar[key] as string} onChange={(e) => setLook({ [key]: e.target.value })}>
                  {OPTIONS[key].map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {COLORS.map(({ key, label }) => (
              <label key={key} className="flex flex-col items-center gap-0.5 text-[11px] text-mute">
                <input type="color" className="size-8 cursor-pointer rounded-lg border border-line bg-transparent p-0.5" value={(draft.avatar[key] as string) || draft.avatar.hairColor} onChange={(e) => setLook({ [key]: e.target.value })} aria-label={`${label} colour`} />
                {label}
              </label>
            ))}
          </div>
          <div className="mt-2 flex gap-1">
            {SKINS.map((s) => <button key={s} className="size-5 rounded-full border border-line" style={{ background: s }} onClick={() => setLook({ skin: s })} aria-label="Skin tone" />)}
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-[1fr_120px] gap-2">
            <Field label="Name"><input className="field" value={draft.name} maxLength={60} onChange={(e) => set({ name: e.target.value })} /></Field>
            <Field label="Called"><input className="field" value={draft.short} maxLength={16} onChange={(e) => set({ short: e.target.value })} /></Field>
          </div>
          <Field label="Tagline"><input className="field" value={draft.tagline} maxLength={80} onChange={(e) => set({ tagline: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Kind">
              <select className="field" value={draft.kind} onChange={(e) => set({ kind: e.target.value as Character["kind"] })}>
                {KINDS.map((k) => <option key={k} value={k}>{k === "historical" ? "Historical (passed away)" : k === "living" ? "Real, living person" : "Original / fictional"}</option>)}
              </select>
            </Field>
            <Field label="Years"><input className="field" placeholder="1879–1955" value={draft.years} maxLength={24} onChange={(e) => set({ years: e.target.value })} /></Field>
          </div>
          {draft.kind === "living" && <p className="rounded-lg bg-sunk px-3 py-2 text-xs text-mute">Living people always appear as a labelled AI impression of their public persona, and won&apos;t invent private details or real quotes.</p>}
          <Field label="Who they are"><textarea className="field min-h-28" value={draft.persona} maxLength={2400} onChange={(e) => set({ persona: e.target.value })} /></Field>
          <Field label="How they talk"><textarea className="field min-h-20" value={draft.voice} maxLength={1600} onChange={(e) => set({ voice: e.target.value })} /></Field>
          <Field label="Lines in their voice (one per line)">
            <textarea className="field min-h-20" value={draft.examples.join("\n")} onChange={(e) => set({ examples: e.target.value.split("\n").slice(0, 5) })} />
          </Field>
          <Field label="First message"><input className="field" value={draft.greeting} maxLength={400} onChange={(e) => set({ greeting: e.target.value })} /></Field>
        </div>
      </div>
      {error && <div className="mt-3"><ErrorBanner error={error} onDismiss={() => setError(null)} onSettings={onOpenSettings} /></div>}
      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
        {!initial && <button className="btn btn-ghost" onClick={() => setDraft(null)}>← Start over</button>}
        {!initial && desc && <button className="btn" disabled={busy} onClick={() => generate()}>{busy ? "Rewriting…" : "Try again"}</button>}
        <div className="flex-1" />
        <button className="btn" disabled={!valid} onClick={() => onSave(clean(draft), false)}>Save</button>
        <button className="btn btn-primary" disabled={!valid} onClick={() => onSave(clean(draft), true)}>Save and chat</button>
      </div>
    </Modal>
  );
}

const clean = (c: Character): Character => ({ ...sanitize({ ...c, examples: c.examples.filter((x) => x.trim()) }, c.id), custom: true });

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block min-w-0">
    <span className="mb-1 block text-xs text-mute">{label}</span>
    {children}
  </label>
);

/** A character's card: who they are, and what you can do with them. */
export function Profile({ c, onClose, onChat, onEdit, onRemix, onDelete }: {
  c: Character;
  onClose: () => void;
  onChat: () => void;
  onEdit: () => void;
  onRemix: () => void;
  onDelete: () => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (what: string, text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(null), 1600); } catch { setCopied("Couldn't copy"); }
  };
  const { custom: _c, ...file } = c; // eslint-disable-line @typescript-eslint/no-unused-vars
  return (
    <Modal title={c.name} onClose={onClose}>
      <div className="flex items-center gap-4">
        <Avatar spec={c.avatar} size={96} />
        <div className="min-w-0">
          <div className="font-display text-2xl leading-tight">{c.name}</div>
          <div className="text-sm text-mute">{[c.years, c.kind === "living" ? "AI impression" : c.kind === "original" ? "Original character" : "AI portrayal"].filter(Boolean).join(" · ")}</div>
          <div className="mt-1 text-sm">{c.tagline}</div>
        </div>
      </div>
      <div className="mt-4 space-y-3 text-sm leading-relaxed">
        <p>{c.persona}</p>
        <p className="text-mute">{c.voice}</p>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button className="btn btn-primary" onClick={onChat}>Chat with {c.short}</button>
        <button className="btn" onClick={() => copy("Link copied", shareUrl(c))}>{copied === "Link copied" ? "Link copied ✓" : "Copy share link"}</button>
        {c.custom ? <button className="btn" onClick={onEdit}>Edit</button> : <button className="btn" onClick={onRemix}>Remix</button>}
        <button className="btn btn-ghost" onClick={() => copy("JSON copied", JSON.stringify({ ...file, id: c.custom ? slugify(c.name) : c.id }, null, 2) + "\n")}>{copied === "JSON copied" ? "JSON copied ✓" : "Copy as file"}</button>
        {c.custom && <button className="btn btn-ghost text-accent" onClick={onDelete}>Delete</button>}
      </div>
      <p className="mt-4 text-xs leading-relaxed text-mute">
        &ldquo;Copy as file&rdquo; gives you the JSON for <code>characters/</code> in the open-source repo, so you can send {c.short} in as a pull request.
      </p>
    </Modal>
  );
}
