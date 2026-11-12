<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Salon
- Characters are `characters/*.json`; allowed portrait values live in `characters/schema.json`. After adding or editing one, run `npm run check` (it validates and regenerates `characters/index.ts`; `prebuild` runs it too).
- Chat orchestration (prompts, who speaks, reply cleanup) is `lib/engine.ts`. Portraits are `components/Avatar.tsx`.
- Agent skills for users are in `skills/`.

## publik API
- Base URL: https://publikhq.com/api/v1 (OpenAI Chat Completions, Responses, Anthropic Messages)
- Models: publik-fast, publik-balanced, publik-smart only; never a vendor model name
- Routes: `/` is the public landing page (`app/page.tsx`, a server component, no gate); the software is `/app` (`app/app/page.tsx`). Share links point at `/app#c=…`; old `/#c=…` links are forwarded by `components/ShareLinkForward.tsx`
- Sign in with publik: the publik module's gate runs before the app's first screen (`components/PublikGate.tsx` wraps only `app/app/page.tsx`, never the landing page or the root layout; the words and every publik call are in `lib/publik.ts`); it also sends usage telemetry (app_opened, then active_session every 30 minutes) through `/api/publik/telemetry`
- Key: per-install `pk_` from POST /installs. This app is hosted for many browsers, so each browser gets its own install and its key is sealed into an http-only cookie (`lib/publik.ts`) instead of the publik credential file; it never reaches client code. Pick the key with `resolveProvider(await cookies(), userKey)`. Env PUBLIK_API_KEY / PUBLIK_API_BASE_URL override in `next dev` only
- App token: publik-app-token.txt (public by design, committed) or PUBLIK_APP_TOKEN. Cookie seal: PUBLIK_COOKIE_SECRET (falls back to a hash of the app token)
- Self-test: `npm run build && PUBLIK_SELF_TEST=1 npm run start` prints `publik self-test: ok <slug> <version>` (instrumentation.ts)
- 402: show error.message plus error.top_up_url only
- Never print or log a key
- Docs: https://publikhq.com/llms.txt, https://publikhq.com/developers, https://publikhq.com/skills/api.md
