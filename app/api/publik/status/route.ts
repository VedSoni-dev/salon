import { cookies } from "next/headers";
import { COOKIE, DISCLOSURE, available, balanceLine, unseal } from "@/lib/publik";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const c = unseal((await cookies()).get(COOKIE)?.value);
  if (!c) return Response.json({ available: available(), connected: false, disclosure: DISCLOSURE });

  let micros: number | null = null;
  let claimState: "anonymous" | "claimed" = "anonymous";
  let claimUrl = c.claim_url;
  let addCreditUrl = c.add_credit_url;
  let plan = "";
  try {
    const res = await fetch(`${c.base_url}/wallet`, { headers: { authorization: `Bearer ${c.key}` }, cache: "no-store" });
    if (res.ok) {
      // GET /wallet answers { pack: {remaining_micros}, starter: {remaining_micros}, plan: {id, label}, claim_state, claim_url, top_up_url }.
      const w = (await res.json()) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
      const n = (v: unknown) => (typeof v === "number" ? v : 0);
      micros = typeof w.balance_micros === "number" ? w.balance_micros : n(w.pack?.remaining_micros) + n(w.starter?.remaining_micros);
      if (w.claim_state === "claimed") claimState = "claimed";
      if (claimState === "claimed") claimUrl = null;
      else if (typeof w.claim_url === "string") claimUrl = w.claim_url;
      if (typeof w.top_up_url === "string" && claimState === "claimed") addCreditUrl = w.top_up_url;
      if (w.plan?.id && w.plan.id !== "none" && typeof w.plan.label === "string") plan = w.plan.label;
    }
  } catch {
    /* the wallet line is a nicety; the card still renders without it */
  }
  return Response.json({
    available: true, connected: true, disclosure: DISCLOSURE,
    balanceLine: plan ? `${plan} plan · ${balanceLine(micros, claimState)}` : balanceLine(micros, claimState), cost: c.cost_sentence,
    claimUrl, addCreditUrl, claimState,
  });
}
