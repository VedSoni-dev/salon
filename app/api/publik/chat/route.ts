// The publik half of Salon's AI. Own keys never come here: they go straight from the browser to
// OpenAI or Anthropic (lib/llm.ts). This route runs only for a browser that chose "Connect your plan".
import { cookies } from "next/headers";
import { MODELS, TIERS, resolveProvider } from "@/lib/publik";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

type Msg = { role: "system" | "user" | "assistant"; content: string };

/** One publik API chat completion with this browser's install key: { tier?, messages, max_tokens?, temperature?, stream? }.
 *  Streams (text/event-stream) when stream is true. A 402 passes through untouched: error.message plus error.top_up_url. */
export async function POST(req: Request) {
  const p = resolveProvider(await cookies(), null);
  if (p.kind !== "publik") {
    return Response.json({ error: { message: "This browser uses its own key. Pick publik plan in Settings to use publik API." } }, { status: 428 });
  }
  const body = (await req.json().catch(() => ({}))) as { tier?: string; messages?: Msg[]; max_tokens?: number; temperature?: number; stream?: boolean };
  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m) => m && ["system", "user", "assistant"].includes(m.role) && typeof m.content === "string")
    .slice(-80)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 20_000) }));
  if (!messages.some((m) => m.role === "user")) return Response.json({ error: { message: "Nothing to send." } }, { status: 400 });
  // Tier models only on publik API, never a vendor model name.
  const model = TIERS.includes(body.tier ?? "") ? body.tier! : MODELS.balanced;
  const max_tokens = Math.min(Math.max(Number(body.max_tokens) || 600, 32), 2000);
  const temperature = Math.min(Math.max(Number(body.temperature ?? 0.9), 0), 1.5);
  const stream = body.stream === true;

  let upstream: Response;
  try {
    upstream = await fetch(`${p.baseURL}/chat/completions`, {
      method: "POST", signal: req.signal, cache: "no-store",
      headers: { "content-type": "application/json", authorization: `Bearer ${p.apiKey}` },
      body: JSON.stringify({ model, stream, max_tokens, temperature, messages }),
    });
  } catch {
    return Response.json({ error: { message: "publik API is not reachable right now. Try again, or use your own key." } }, { status: 502 });
  }
  const headers = new Headers({ "cache-control": "no-store" });
  upstream.headers.forEach((v, k) => { if (k.startsWith("x-publik-")) headers.set(k, v); });
  if (!upstream.ok || !upstream.body || !stream) {
    headers.set("content-type", "application/json");
    return new Response(await upstream.text(), { status: upstream.status, headers });
  }
  headers.set("content-type", "text/event-stream");
  return new Response(upstream.body, { status: 200, headers });
}
