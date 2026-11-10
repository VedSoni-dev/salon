// publik.ts — publik API as one provider option, for a server the builder deploys.
// Adapted from https://publikhq.com/sdk/publik.ts.md: the reference module keeps one
// credential file per computer; this app runs on a server and serves many browsers, so each
// browser gets its own install and its key rides back in an encrypted, http-only cookie.
// Server-only: never import this from a client component.
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const APP_SLUG = process.env.PUBLIK_APP_SLUG?.trim() || "salon";
export const APP_VERSION = "0.1.0";
export const DEFAULT_BASE_URL = "https://publikhq.com/api/v1";
export const BASE_URL = process.env.PUBLIK_API_BASE_URL?.trim() || DEFAULT_BASE_URL;
/** Ask for a tier, never a vendor model name. */
export const MODELS = { fast: "publik-fast", balanced: "publik-balanced", smart: "publik-smart" } as const;
export const TIERS: string[] = Object.values(MODELS);
/** Show this and get a yes BEFORE provision(). */
export const DISCLOSURE =
  "This app can use publik API for its AI features: no key to paste, priced per use in dollars from a publik balance that starts at $0.00. " +
  "Linking this browser to a publik account gives $0.05 of free use, once. Your prompts go through publik's servers to the model; you can switch to your own key at any time.";

export const COOKIE = "salon_pk";

export interface PublikCredential {
  key: string;
  base_url: string;
  install_id: string;
  claim_url: string | null;
  claim_state: "anonymous" | "claimed";
  add_credit_url: string | null;
  cost_sentence: string | null;
  balance_micros: number | null;
}

/** The app token. PUBLIK_APP_TOKEN on a deployed server; a committed publik-app-token.txt at the
 *  repo root also works for people who run it themselves. Public by design: it only mints capped keys. */
export function appToken(): string {
  const env = process.env.PUBLIK_APP_TOKEN?.trim();
  if (env) return env;
  const file = join(process.cwd(), "publik-app-token.txt");
  try {
    return existsSync(file) ? readFileSync(file, "utf8").trim() : "";
  } catch {
    return "";
  }
}

export const available = () => appToken().startsWith("pat_");

/** Call only after the user accepted DISCLOSURE. Throws a readable message; the caller offers the user's own key. */
export async function provision(opts: { installId?: string; os?: string; deviceName?: string } = {}): Promise<PublikCredential> {
  const token = appToken();
  if (!token.startsWith("pat_")) throw new Error("This build has no publik API app token. Use your own key for now.");
  let installId = opts.installId || randomUUID();
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(`${DEFAULT_BASE_URL}/installs`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        app_token: token, app_slug: APP_SLUG, app_version: APP_VERSION,
        os: opts.os ?? "linux", arch: "web", device_name: (opts.deviceName ?? "Web browser").slice(0, 120),
        install_id: installId, disclosure_version: 1, dialects: ["chat_completions"],
      }),
    });
    const body = (await res.json().catch(() => ({}))) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    if ((res.status === 201 || res.status === 200) && body.key) {
      return {
        key: body.key, base_url: body.base_url ?? DEFAULT_BASE_URL, install_id: body.install_id ?? installId,
        claim_url: body.claim_url ?? null, claim_state: body.claim_state ?? "anonymous",
        add_credit_url: body.wallet?.add_credit_url ?? null, cost_sentence: body.disclosure?.cost ?? null,
        balance_micros: body.balance_micros ?? null,
      };
    }
    // A replay whose key this browser no longer holds, or an install its owner revoked: one fresh install_id.
    if (res.status === 200 || body.error?.type === "install_revoked") { installId = randomUUID(); continue; }
    throw new Error(body.error?.message ?? `publik API could not set up this browser (${res.status}). Use your own key for now.`);
  }
  throw new Error("publik API could not set up this browser. Use your own key for now.");
}

/** Builder check, run by the BUILT app: start it with PUBLIK_SELF_TEST=1, print this line, exit. */
export async function selfTest(): Promise<string> {
  try {
    const c = await provision({ deviceName: "self-test" });
    return `publik self-test: ok ${APP_SLUG} ${APP_VERSION} (install ${c.install_id.slice(0, 8)})`;
  } catch (e) {
    return `publik self-test: failed: ${e instanceof Error ? e.message : String(e)}`;
  }
}

/** First-run card, line 1. A new install is $0.00 until it is linked. */
export function balanceLine(micros: number | null | undefined, claimState: "anonymous" | "claimed" = "anonymous"): string {
  if (micros == null) return "";
  const dollars = `$${(micros / 1_000_000).toFixed(2)}`;
  return micros === 0 && claimState === "anonymous" ? `${dollars} · link this browser for $0.05 of free use` : `${dollars} of publik balance`;
}

// --- the cookie: AES-256-GCM under a key derived from the app token, so the pk_ key is opaque even to its own browser ---

const secret = () => createHash("sha256").update(`salon-cookie:${process.env.PUBLIK_COOKIE_SECRET || appToken()}`).digest();

type Sealed = Pick<PublikCredential, "key" | "base_url" | "install_id" | "claim_url" | "add_credit_url" | "cost_sentence">;

export function seal(c: PublikCredential): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secret(), iv);
  const slim: Sealed = { key: c.key, base_url: c.base_url, install_id: c.install_id, claim_url: c.claim_url, add_credit_url: c.add_credit_url, cost_sentence: c.cost_sentence };
  const data = Buffer.concat([cipher.update(JSON.stringify(slim), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64url");
}

export function unseal(value: string | undefined): Sealed | null {
  // Without an app token the cookie key would be a public constant, so accept no cookies at all.
  if (!value || !available()) return null;
  try {
    const raw = Buffer.from(value, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", secret(), raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    const c = JSON.parse(Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8")) as Sealed;
    // The server only ever talks to the configured publik base URL, whatever the cookie says.
    return typeof c.key === "string" && c.key.startsWith("pk_") ? { ...c, base_url: BASE_URL } : null;
  } catch {
    return null;
  }
}
