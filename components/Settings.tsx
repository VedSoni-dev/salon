"use client";

import { useState } from "react";
import { effectiveSettings, listModels, pickDefault } from "@/lib/llm";
import type { Settings } from "@/lib/types";
import { PublikChoice, usePublik } from "./PublikGate";
import { Modal } from "./ui";

const TABS: { id: "openai" | "anthropic"; name: string; blurb: string }[] = [
  { id: "openai", name: "OpenAI", blurb: "Your own key" },
  { id: "anthropic", name: "Claude", blurb: "Your own key" },
];

export function SettingsDialog({ settings, onChange, onClose }: {
  settings: Settings; onChange: (s: Settings) => void; onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const set = (p: Partial<Settings>) => onChange({ ...settings, ...p });
  // publik plan or My own key: the choice from Sign in with publik, changed with <PublikChoice /> below.
  const { choice } = usePublik();
  const tab = effectiveSettings(settings, choice).provider;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setNote(null);
    try { await fn(); } catch (e) { setNote({ ok: false, text: e instanceof Error ? e.message : "Something went wrong." }); }
    setBusy(false);
  };

  const check = (provider: "openai" | "anthropic") => run(async () => {
    const list = await listModels(settings, provider);
    setModels(list);
    const key = provider === "openai" ? "openaiModel" : "anthropicModel";
    const current = settings[key];
    const next = current && list.includes(current) ? current : pickDefault(list) || current;
    set({ [key]: next });
    setNote({ ok: true, text: `Key works. ${list.length} models available; using ${next}.` });
  });

  return (
    <Modal title="Settings" onClose={onClose}>
      <label className="mb-5 block">
        <span className="mb-1 block text-xs text-mute">Your name in chats</span>
        <input className="field" placeholder="You" maxLength={24} value={settings.userName} onChange={(e) => set({ userName: e.target.value })} />
        <span className="mt-1 block text-xs text-mute">The characters call you this.</span>
      </label>
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-mute">Where the AI comes from</div>
      <div className="mb-4 text-sm"><PublikChoice /></div>
      {tab !== "publik" && <div className="mb-4 grid grid-cols-2 gap-2" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => { set({ provider: t.id }); setNote(null); setModels([]); }}
            className={`rounded-xl border px-3 py-2.5 text-left transition ${tab === t.id ? "border-accent bg-accent/10" : "border-line hover:border-mute"}`}>
            <div className="text-sm font-semibold">{t.name}</div>
            <div className="text-xs text-mute">{t.blurb}</div>
          </button>
        ))}
      </div>}

      {tab === "publik" && (
        <div className="space-y-3 text-sm">
          <label className="block">
            <span className="mb-1 block text-xs text-mute">Model tier</span>
            <select className="field" value={settings.publikTier} onChange={(e) => set({ publikTier: e.target.value as Settings["publikTier"] })}>
              <option value="publik-fast">Fast: cheapest, snappiest replies</option>
              <option value="publik-balanced">Balanced: the default</option>
              <option value="publik-smart">Smart: strongest</option>
            </select>
          </label>
        </div>
      )}

      {tab === "openai" && (
        <div className="space-y-3 text-sm">
          <label className="block">
            <span className="mb-1 block text-xs text-mute">OpenAI API key</span>
            <input className="field font-mono" type="password" autoComplete="off" placeholder="sk-…" value={settings.openaiKey} onChange={(e) => set({ openaiKey: e.target.value.trim() })} />
          </label>
          <div className="flex gap-2">
            <label className="block min-w-0 flex-1">
              <span className="mb-1 block text-xs text-mute">Model</span>
              <input className="field" list="oai-models" placeholder="Check the key to pick one" value={settings.openaiModel} onChange={(e) => set({ openaiModel: e.target.value.trim() })} />
              <datalist id="oai-models">{models.map((m) => <option key={m} value={m} />)}</datalist>
            </label>
            <button className="btn mt-5" disabled={busy || !settings.openaiKey} onClick={() => check("openai")}>{busy ? "Checking…" : "Check key"}</button>
          </div>
          <details className="text-xs text-mute">
            <summary className="cursor-pointer">Use another OpenAI-compatible endpoint (OpenRouter, Ollama, …)</summary>
            <input className="field mt-2" placeholder="https://api.openai.com/v1" value={settings.openaiBase} onChange={(e) => set({ openaiBase: e.target.value.trim() })} />
          </details>
          <p className="text-xs leading-relaxed text-mute">Your key is kept in this browser only and sent straight to OpenAI. It never touches Salon&apos;s server.</p>
        </div>
      )}

      {tab === "anthropic" && (
        <div className="space-y-3 text-sm">
          <label className="block">
            <span className="mb-1 block text-xs text-mute">Anthropic API key</span>
            <input className="field font-mono" type="password" autoComplete="off" placeholder="sk-ant-…" value={settings.anthropicKey} onChange={(e) => set({ anthropicKey: e.target.value.trim() })} />
          </label>
          <div className="flex gap-2">
            <label className="block min-w-0 flex-1">
              <span className="mb-1 block text-xs text-mute">Model</span>
              <input className="field" list="ant-models" value={settings.anthropicModel} onChange={(e) => set({ anthropicModel: e.target.value.trim() })} />
              <datalist id="ant-models">{(models.length ? models : ["claude-haiku-5-5", "claude-sonnet-5-5", "claude-opus-5-5"]).map((m) => <option key={m} value={m} />)}</datalist>
            </label>
            <button className="btn mt-5" disabled={busy || !settings.anthropicKey} onClick={() => check("anthropic")}>{busy ? "Checking…" : "Check key"}</button>
          </div>
          <p className="text-xs leading-relaxed text-mute">Your key is kept in this browser only and sent straight to Anthropic. It never touches Salon&apos;s server. An API key from console.anthropic.com is needed; a Claude subscription login can&apos;t be used here.</p>
        </div>
      )}

      {note && <p role="status" className={`mt-3 rounded-lg px-3 py-2 text-sm ${note.ok ? "bg-sunk" : "bg-accent/10"}`}>{note.text}</p>}
      {/* Forget this browser's publik install: the reload opens at Sign in with publik again. */}
      <button className="mt-4 text-xs text-mute underline underline-offset-2" disabled={busy}
        onClick={() => run(async () => { await fetch("/api/publik/provision", { method: "DELETE" }); location.reload(); })}>
        Sign out of publik in this browser
      </button>
      <button className="btn mt-5 w-full" onClick={onClose}>Done</button>
    </Modal>
  );
}
