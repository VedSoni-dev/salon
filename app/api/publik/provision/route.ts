import { cookies } from "next/headers";
import { COOKIE, DISCLOSURE, balanceLine, provision, seal } from "@/lib/publik";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { install_id?: string; accepted?: boolean };
  if (!body.accepted) {
    return Response.json({ error: { message: "Accept the publik API notice first." } }, { status: 428 });
  }
  const ua = req.headers.get("user-agent") ?? "";
  const os = /Windows/i.test(ua) ? "windows" : /Mac OS X|Macintosh|iPhone|iPad/i.test(ua) ? "macos" : "linux";
  const installId = /^[0-9a-f-]{36}$/i.test(body.install_id ?? "") ? body.install_id : undefined;
  try {
    const c = await provision({ installId, os, deviceName: "Web browser" });
    (await cookies()).set(COOKIE, seal(c), {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365,
    });
    return Response.json({
      available: true, connected: true, disclosure: DISCLOSURE,
      balanceLine: balanceLine(c.balance_micros, c.claim_state), cost: c.cost_sentence,
      claimUrl: c.claim_url, addCreditUrl: c.add_credit_url, claimState: c.claim_state,
    });
  } catch (e) {
    return Response.json({ error: { message: e instanceof Error ? e.message : "publik API could not set up this browser." } }, { status: 502 });
  }
}

/** Forget this browser's publik key. */
export async function DELETE() {
  (await cookies()).delete(COOKIE);
  return Response.json({ ok: true });
}
