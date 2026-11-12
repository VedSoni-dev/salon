import type { Settings } from "./types";

export class LLMError extends Error {
  kind: "no_key" | "auth" | "balance" | "rate" | "offline" | "consent" | "other";
  link?: string;
  constructor(kind: LLMError["kind"], message: string, link?: string) {
    super(message);
    this.kind = kind;
    this.link = link;
  }
}

export interface Meta {
  /** Raw x-publik-* headers from the last publik call, lower-cased, prefix stripped. */
  publik?: Record<string, string>;
}

export type Msg = { role: "system" | "user" | "assistant"; content: string };

interface Req {
  /** The first may be a system message; the rest alternate user/assistant. */
  messages: Msg[];
  maxTokens?: number;
  temperature?: number;
  settings: Settings;
  signal?: AbortSignal;
  onDelta: (text: string) => void;
  onMeta?: (m: Meta) => void;
}

/** The provider for this browser: publik API when the person chose "Connect your plan" at Sign in with publik
 *  (or "publik plan" in Settings), else their own OpenAI or Claude key exactly as before. */
export function effectiveSettings(s: Settings, choice: "publik" | "own_key" | null): Settings {
  if (choice === "publik") return { ...s, provider: "publik" };
  return s.provider === "publik" ? { ...s, provider: "openai" } : s;
}

/** One streaming call, whichever provider the user picked. Own keys go straight from this browser to the provider. */
export async function streamChat(req: Req): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new LLMError("offline", "You're offline. Reconnect and try again.");
  }
  const { settings: s } = req;
  try {
    if (s.provider === "openai") return await openai(req);
    if (s.provider === "anthropic") return await anthropic(req);
    return await publik(req);
  } catch (e) {
    if (e instanceof LLMError) throw e;
    if ((e as Error)?.name === "AbortError") throw e;
    throw new LLMError("offline", "Couldn't reach the model. Check your connection and try again.");
  }
}

async function fail(res: Response, who: string): Promise<never> {
  const body = await res.json().catch(() => ({}));
  const msg: string = body?.error?.message ?? body?.message ?? `${who} answered ${res.status}.`;
  if (res.status === 402) {
    // publik's 402: error.message plus its one link, error.top_up_url.
    const topUp = body?.error?.top_up_url;
    throw new LLMError("balance", msg, typeof topUp === "string" && topUp.startsWith("https://") ? topUp : undefined);
  }
  if (res.status === 428) throw new LLMError("consent", msg);
  if (res.status === 401 || res.status === 403) throw new LLMError("auth", `${who} rejected the key. ${msg}`);
  if (res.status === 429) throw new LLMError("rate", `${who} is rate-limiting you. Wait a moment and retry. ${msg}`);
  throw new LLMError("other", msg);
}

async function sse(res: Response, onEvent: (data: Record<string, unknown>) => void) {
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i: number;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(data);
      } catch {
        continue; // a partial or non-JSON keep-alive line
      }
      onEvent(parsed);
    }
  }
}

type OpenAIChunk = { choices?: { delta?: { content?: string } }[]; error?: { message?: string } };

async function openai({ messages, maxTokens, temperature, settings, signal, onDelta }: Req) {
  if (!settings.openaiKey) throw new LLMError("no_key", "Add your OpenAI key in Settings first.");
  const base = (settings.openaiBase || "https://api.openai.com/v1").replace(/\/+$/, "");
  const reasoning = /^(o\d|gpt-5)/.test(settings.openaiModel);
  if (reasoning && maxTokens) maxTokens = Math.max(maxTokens, 4000); // reasoning tokens count against the cap
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    signal,
    headers: { "content-type": "application/json", authorization: `Bearer ${settings.openaiKey}` },
    body: JSON.stringify({
      model: settings.openaiModel || "gpt-4o-mini",
      stream: true,
      ...(base.includes("api.openai.com") ? { max_completion_tokens: maxTokens ?? 600 } : { max_tokens: maxTokens ?? 600 }),
      ...(temperature != null && !reasoning ? { temperature } : {}),
      messages,
    }),
  });
  if (!res.ok) await fail(res, "OpenAI");
  await sse(res, (d) => {
    const c = d as OpenAIChunk;
    if (c.error?.message) throw new LLMError("other", c.error.message);
    const t = c.choices?.[0]?.delta?.content;
    if (t) onDelta(t);
  });
}

async function anthropic({ messages, maxTokens, temperature, settings, signal, onDelta }: Req) {
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  if (!settings.anthropicKey) throw new LLMError("no_key", "Add your Anthropic key in Settings first.");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    signal,
    headers: {
      "content-type": "application/json",
      "x-api-key": settings.anthropicKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: settings.anthropicModel || "claude-haiku-5-5",
      max_tokens: maxTokens ?? 600,
      ...(temperature != null ? { temperature: Math.min(temperature, 1) } : {}),
      stream: true,
      system,
      messages: messages.filter((m) => m.role !== "system"),
    }),
  });
  if (!res.ok) await fail(res, "Anthropic");
  await sse(res, (d) => {
    const e = d as { type?: string; delta?: { text?: string }; error?: { message?: string } };
    if (e.type === "error") throw new LLMError("other", e.error?.message ?? "Anthropic stopped the stream.");
    if (e.type === "content_block_delta" && e.delta?.text) onDelta(e.delta.text);
  });
}

async function publik({ messages, maxTokens, temperature, settings, signal, onDelta, onMeta }: Req) {
  const res = await fetch("/api/publik/chat", {
    method: "POST",
    signal,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ tier: settings.publikTier, messages, max_tokens: maxTokens, temperature, stream: true }),
  });
  const headers: Record<string, string> = {};
  res.headers.forEach((v, k) => {
    if (k.startsWith("x-publik-")) headers[k.slice(9)] = v;
  });
  if (Object.keys(headers).length) onMeta?.({ publik: headers });
  if (!res.ok) await fail(res, "publik API");
  await sse(res, (d) => {
    const c = d as OpenAIChunk;
    if (c.error?.message) throw new LLMError("other", c.error.message);
    const t = c.choices?.[0]?.delta?.content;
    if (t) onDelta(t);
  });
}

/** A whole answer as one string, for small structured calls. */
export async function complete(req: Omit<Req, "onDelta">): Promise<string> {
  let out = "";
  await streamChat({ ...req, onDelta: (t) => { out += t; } });
  return out;
}

/** Ask the provider which models this key can use, for the model picker. */
export async function listModels(s: Settings, provider: "openai" | "anthropic"): Promise<string[]> {
  if (provider === "openai") {
    const base = (s.openaiBase || "https://api.openai.com/v1").replace(/\/+$/, "");
    const res = await fetch(`${base}/models`, { headers: { authorization: `Bearer ${s.openaiKey}` } });
    if (!res.ok) await fail(res, "OpenAI");
    const ids: string[] = ((await res.json()).data ?? []).map((m: { id: string }) => m.id);
    const chat = ids.filter((id) => !/embed|whisper|tts|audio|image|dall|moderation|realtime|transcribe|sora|babbage|davinci/i.test(id));
    return (chat.length ? chat : ids).sort();
  }
  const res = await fetch("https://api.anthropic.com/v1/models?limit=100", {
    headers: {
      "x-api-key": s.anthropicKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
  });
  if (!res.ok) await fail(res, "Anthropic");
  return ((await res.json()).data ?? []).map((m: { id: string }) => m.id);
}

/** A sensible default from whatever the key can reach: small and fast first. */
export function pickDefault(models: string[]): string {
  const prefs = [/^gpt-[\d.]+-mini$/, /^gpt-.*mini/, /haiku/, /^gpt-[\d.]+$/, /sonnet/, /^gpt-/];
  for (const p of prefs) {
    const hit = models.filter((m) => p.test(m)).sort().pop();
    if (hit) return hit;
  }
  return models[0] ?? "";
}
