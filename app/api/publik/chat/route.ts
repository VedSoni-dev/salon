import { cookies } from "next/headers";
import { COOKIE, MODELS, TIERS, unseal } from "@/lib/publik";

export const runtime = "nodejs";
export const maxDuration = 120;

type Msg = { role: "system" | "user" | "assistant"; content: string };

/** Streams one publik chat completion for this browser's own install key. */
export async function POST(req: Request) {
  const c = unseal((await cookies()).get(COOKIE)?.value);
  if (!c) {
    return Response.json({ error: { message: "Turn on publik API first, or use your own key." } }, { status: 428 });
  }
  const body = (await req.json().catch(() => ({}))) as { tier?: string; messages?: Msg[]; max_tokens?: number; temperature?: number };
  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m) => m && ["system", "user", "assistant"].includes(m.role) && typeof m.content === "string")
    .slice(-80)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 20_000) }));
  if (!messages.some((m) => m.role === "user")) return Response.json({ error: { message: "Nothing to send." } }, { status: 400 });
  const model = TIERS.includes(body.tier ?? "") ? body.tier! : MODELS.balanced;
  const max_tokens = Math.min(Math.max(Number(body.max_tokens) || 600, 32), 2000);
  const temperature = Math.min(Math.max(Number(body.temperature ?? 0.9), 0), 1.5);

  let upstream: Response;
  try {
    upstream = await fetch(`${c.base_url}/chat/completions`, {
      method: "POST",
      signal: req.signal,
      headers: { "content-type": "application/json", authorization: `Bearer ${c.key}` },
      body: JSON.stringify({ model, stream: true, max_tokens, temperature, messages }),
    });
  } catch {
    return Response.json({ error: { message: "publik API is unreachable right now. Try again, or use your own key." } }, { status: 502 });
  }

  const headers = new Headers({ "cache-control": "no-store" });
  upstream.headers.forEach((v, k) => {
    if (k.startsWith("x-publik-")) headers.set(k, v);
  });
  if (!upstream.ok || !upstream.body) {
    // A 402 carries error.message and error.top_up_url; pass it through untouched.
    headers.set("content-type", "application/json");
    return new Response(await upstream.text(), { status: upstream.status, headers });
  }
  headers.set("content-type", "text/event-stream");
  return new Response(upstream.body, { status: 200, headers });
}
