// Browser checks for the app behind the gate, run against a local server with Sign in with publik and
// the model stubbed in the page (no publik traffic, no spend):
//
//   npm run dev -- -p 4488        (in another terminal)
//   npm run e2e                   (BASE=http://localhost:4488 by default; BROWSER=webkit for Safari's engine)
//
// Needs a browser that playwright-core can find (npx playwright install chromium).
import { chromium, webkit } from "playwright-core";

const BASE = process.env.BASE || "http://localhost:4488";
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${detail ? `  (${detail})` : ""}`);
};

const browser = await (process.env.BROWSER === "webkit" ? webkit : chromium).launch();

/** Runs in the page before the app: /api/publik/chat answers from window.__stub, streamed in small pieces. */
function stubModel() {
  const stub = (window.__stub = { reply: "A stubbed answer.", chunkMs: 0, status: 200, calls: [] });
  const real = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input.url;
    if (!url.includes("/api/publik/chat")) return real(input, init);
    const body = JSON.parse(init?.body ?? "{}");
    const system = body.messages?.[0]?.content ?? "";
    const kind = system.startsWith("You run turn-taking") ? "director" : system.startsWith("You design characters") ? "creator" : "reply";
    stub.calls.push({ kind, body });
    if (stub.status !== 200) {
      return new Response(JSON.stringify({ error: { message: "The model is having a moment." } }), { status: stub.status, headers: { "content-type": "application/json" } });
    }
    let text = stub.reply;
    if (kind === "director") text = '{"speakers":[]}';
    if (kind === "creator") text = JSON.stringify({ name: "Pip the Pirate", short: "Pip", tagline: "Scared of water", kind: "original", persona: "A pirate who cannot swim.", voice: "Short and salty.", examples: ["Arr."], greeting: "Ahoy!" });
    const pieces = text.match(/[\s\S]{1,6}/g) ?? [];
    const enc = new TextEncoder();
    const signal = init?.signal;
    const stream = new ReadableStream({
      async start(ctrl) {
        for (const p of pieces) {
          if (stub.chunkMs) await new Promise((r) => setTimeout(r, stub.chunkMs));
          if (signal?.aborted) return ctrl.error(new DOMException("Aborted", "AbortError"));
          ctrl.enqueue(enc.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: p } }] })}\n\n`));
        }
        ctrl.enqueue(enc.encode("data: [DONE]\n\n"));
        ctrl.close();
      },
    });
    return new Response(stream, { status: 200, headers: { "content-type": "text/event-stream" } });
  };
}

/** A fresh browser profile with the gate answered "ready" on the publik plan. */
async function session() {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  await context.route("**/api/publik/status", (r) =>
    r.fulfill({ json: { state: "ready", choice: "publik", usesAi: true, handle: "tester", telemetrySeconds: 3600 } }),
  );
  await context.route("**/api/publik/telemetry", (r) => r.fulfill({ json: { sent: false } }));
  await context.addInitScript(stubModel);
  const open = async () => {
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("dialog", (d) => d.accept());
    await page.goto(`${BASE}/app`);
    await page.getByRole("heading", { name: /group chat\?/ }).waitFor();
    return page;
  };
  return { context, errors, open };
}

/** One group of checks; a crash in it is a failure, and the next group still runs. */
async function section(fn, title) {
  try { await fn(); } catch (e) { check(`${title}: ran to the end`, false, String(e.message).split("\n")[0]); }
}

const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("salon:chats:v1") ?? "[]"));
const box = (page) => page.getByRole("textbox", { name: "Message" });
const idle = (page) => page.getByRole("button", { name: "Send" }).waitFor();

/** From the home screen: a one-on-one chat with a built-in character. */
async function dm(page, name, short) {
  await page.locator('button[aria-pressed="false"]', { hasText: name }).click();
  await page.getByRole("button", { name: `Chat with ${short}` }).click();
  await box(page).waitFor();
}
async function say(page, text) {
  await box(page).fill(text);
  await box(page).press("Enter");
}
const home = (page) => page.getByRole("button", { name: /New chat/ }).click();

// ——— 1. one-on-one: a message gets an answer and both are kept ———
await section(async () => {
  const s = await session();
  const page = await s.open();
  await dm(page, "Ada Lovelace", "Ada");
  await say(page, "hello there");
  await page.getByRole("main").getByText("A stubbed answer.").waitFor();
  await idle(page);
  await page.waitForTimeout(700);
  const chats = await stored(page);
  check("a message gets an answer, and the chat is saved", chats.length === 1 && chats[0].messages.length === 3, `${chats[0]?.messages.length} messages`);

  // ——— 2. a reply with a line that starts with a colon is shown whole ———
  await page.evaluate(() => { window.__stub.reply = "Of course.\n:) Ask me anything.\nI mean it."; });
  await say(page, "can I ask you something");
  await page.getByRole("main").getByText("Of course.").waitFor();
  await idle(page);
  const shown = await page.getByRole("main").getByText("Of course.").last().innerText();
  check("a reply line starting with a colon is not cut off", shown.includes("I mean it."), JSON.stringify(shown));

  // ——— 3. the message box goes back to one line after a long message ———
  await page.evaluate(() => { window.__stub.reply = "Noted."; });
  await box(page).click();
  for (let i = 0; i < 6; i++) { await page.keyboard.type(`line ${i}`); await page.keyboard.press("Shift+Enter"); }
  const tall = await box(page).evaluate((el) => el.getBoundingClientRect().height);
  await page.keyboard.press("Enter");
  await idle(page);
  const after = await box(page).evaluate((el) => el.getBoundingClientRect().height);
  check("the message box shrinks back after sending six lines", tall > 100 && after < 60, `${Math.round(tall)}px then ${Math.round(after)}px`);

  // ——— 4. a failed reply, then Clear messages: the error and its Try again go too ———
  await page.evaluate(() => { window.__stub.status = 500; });
  await say(page, "this one fails");
  await page.getByRole("main").getByRole("alert").waitFor();
  await page.getByTitle("Chat options").click();
  await page.getByRole("button", { name: "Clear messages" }).click();
  await page.waitForTimeout(200);
  check("Clear messages also clears the error about a message that's gone", (await page.getByRole("main").getByRole("alert").count()) === 0);
  await page.evaluate(() => { window.__stub.status = 200; });

  check("no console errors (one-on-one)", s.errors.filter((e) => !/500/.test(e)).length === 0, s.errors.join(" | "));
  await s.context.close();
}, "1. one-on-one: a message gets an answer and both are kept");

// ——— 5. saving: while a reply streams, and when the tab goes away right after sending ———
await section(async () => {
  const s = await session();
  const page = await s.open();
  await dm(page, "Socrates", "Socrates");
  await page.waitForTimeout(600);
  await page.evaluate(() => { window.__stub.reply = "word ".repeat(40); window.__stub.chunkMs = 100; });
  await say(page, "a long answer please");
  await page.waitForTimeout(1500);
  const mid = await stored(page);
  check("the chat is saved while a long reply is still streaming", mid[0]?.messages.some((m) => m.text === "a long answer please") === true, `${mid[0]?.messages.length} messages stored mid-stream`);
  await page.keyboard.press("Escape");
  await idle(page);
  await page.waitForTimeout(600);

  await page.evaluate(() => { window.__stub.chunkMs = 400; });
  await say(page, "typed just before leaving");
  await page.waitForTimeout(80);
  await page.goto("about:blank");
  await page.goto(`${BASE}/app`);
  await box(page).waitFor(); // the tab reopens on the chat it was in
  const back = await stored(page);
  check("a message sent a moment before the tab goes away is kept", back[0]?.messages.some((m) => m.text === "typed just before leaving") === true);
  await s.context.close();
}, "5. saving: while a reply streams, and when the tab goes away right after sending");

// ——— 6. two tabs ———
await section(async () => {
  const s = await session();
  const one = await s.open();
  await dm(one, "Ada Lovelace", "Ada");
  await say(one, "from tab one");
  await idle(one);
  await one.waitForTimeout(700);

  const two = await s.open();
  await home(two);
  await dm(two, "Socrates", "Socrates");
  await say(two, "from tab two");
  await idle(two);
  await two.waitForTimeout(700);
  check("tab two's new chat shows up in tab one's list", (await one.getByRole("navigation", { name: "Chats" }).getByText("Socrates").count()) > 0);

  await say(one, "tab one again");
  await idle(one);
  await one.waitForTimeout(700);
  const both = await stored(one);
  check("a tab left open doesn't erase a chat made in another tab", both.length === 2, `${both.length} chats stored`);

  // Deleting in one tab: the other drops it and doesn't write it back.
  await two.getByTitle("Chat options").click();
  await two.getByRole("button", { name: "Delete chat" }).click();
  await two.waitForTimeout(700);
  await say(one, "and once more");
  await idle(one);
  await one.waitForTimeout(700);
  const left = await stored(one);
  check("a chat deleted in one tab stays deleted", left.length === 1 && left[0].members[0] === "ada-lovelace", `${left.length} chats stored`);
  check("no console errors (two tabs)", s.errors.length === 0, s.errors.join(" | "));
  await s.context.close();
}, "6. two tabs");

// ——— 7. making a character: closing by accident, and a chat whose character was deleted ———
await section(async () => {
  const s = await session();
  const page = await s.open();
  const dialogs = [];
  page.removeAllListeners("dialog");
  page.on("dialog", (d) => { dialogs.push(d.message()); d.dismiss(); });

  await page.getByRole("button", { name: "Make a character" }).click();
  await page.getByPlaceholder(/Bob Ross/).fill("a pirate scared of water");
  await page.getByRole("button", { name: "Make them" }).click();
  await page.getByRole("dialog", { name: "Your character" }).waitFor();
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  check("Escape on an unsaved character asks before throwing it away", dialogs.length === 1 && (await page.getByRole("dialog", { name: "Your character" }).count()) === 1, `${dialogs.length} prompts`);

  if (!(await page.getByRole("dialog", { name: "Your character" }).count())) { // thrown away: make Pip again for the checks below
    await page.getByRole("button", { name: "Make a character" }).click();
    await page.getByPlaceholder(/Bob Ross/).fill("a pirate scared of water");
    await page.getByRole("button", { name: "Make them" }).click();
  }
  await page.getByRole("button", { name: "Save and chat" }).click();
  await box(page).waitFor();
  await say(page, "ahoy");
  await idle(page);
  const before = await page.evaluate(() => window.__stub.calls.length);

  // Delete Pip from their profile, then come back to the chat.
  page.removeAllListeners("dialog");
  page.on("dialog", (d) => d.accept());
  await page.locator("header button", { hasText: "Pip the Pirate" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await page.waitForTimeout(300);
  const canType = await box(page).isVisible().catch(() => false);
  if (canType) { await say(page, "anyone there?"); await page.waitForTimeout(600); }
  const calls = await page.evaluate(() => window.__stub.calls.length);
  const told = (await page.getByRole("main").getByText(/was deleted/).count()) > 0;
  check("a chat whose only character was deleted says so, and spends nothing", told && calls === before, `${calls - before} model calls, notice ${told}`);
  check("no console errors (characters)", s.errors.length === 0, s.errors.join(" | "));
  await s.context.close();
}, "7. making a character: closing by accident, and a chat whose character was deleted");

// ——— 8. group chat still works end to end ———
await section(async () => {
  const s = await session();
  const page = await s.open();
  await page.getByRole("button", { name: /Socrates × Gran/ }).click();
  await box(page).waitFor();
  await page.evaluate(() => { window.__stub.reply = "Well now."; });
  await say(page, "What's the meaning of life?");
  await idle(page);
  const chats = await stored(page).then(async (c) => (c.length ? c : (await page.waitForTimeout(700), stored(page))));
  const speakers = new Set(chats[0].messages.filter((m) => m.from !== "user").map((m) => m.from));
  check("in a group of two, both answer", speakers.size === 2, [...speakers].join(", "));
  await page.getByRole("button", { name: /Let them talk/ }).click();
  await page.waitForTimeout(400);
  await idle(page);
  await page.waitForTimeout(700);
  const more = await stored(page);
  check("Let them talk adds four more lines", more[0].messages.length === chats[0].messages.length + 4, `${chats[0].messages.length} then ${more[0].messages.length}`);
  check("no console errors (group)", s.errors.length === 0, s.errors.join(" | "));
  await s.context.close();
}, "8. group chat still works end to end");

// 9. Other sites (ported from Linework). Every request here is refused before it reaches publik, so even a dev
// server with the real app token sends nothing to publik. The cookies are placeholders this browser "already has".
await section(async () => {
  const chatBody = JSON.stringify({ messages: [{ role: "user", content: "hi" }] });
  const anon = await fetch(`${BASE}/api/publik/chat`, { method: "POST", headers: { "content-type": "application/json" }, body: chatBody });
  check("a stranger with no publik cookie still gets the old answer, not 403", anon.status === 428, String(anon.status));
  const xpost = (path, headers, body = "{}") => fetch(BASE + path, { method: "POST", headers: { "content-type": "application/json", ...headers }, body });
  const xs = [
    (await xpost("/api/publik/chat", { origin: "null" }, chatBody)).status,
    (await xpost("/api/publik/chat", { origin: "https://other.vercel.app", "sec-fetch-site": "same-site" }, chatBody)).status,
    (await xpost("/api/publik/chat", { "sec-fetch-site": "cross-site" }, chatBody)).status,
    (await xpost("/api/publik/provision", { origin: "https://evil.example" })).status,
    (await xpost("/api/publik/choice", { origin: "https://evil.example" }, '{"choice":"own_key"}')).status,
    (await xpost("/api/publik/telemetry", { origin: "null" }, '{"event":"app_opened"}')).status,
    (await fetch(`${BASE}/api/publik/provision`, { method: "DELETE", headers: { origin: "https://evil.example" } })).status,
  ];
  check("Origin null, another subdomain, Sec-Fetch-Site cross-site, and another site on every POST/DELETE route: 403", xs.every((x) => x === 403), xs.join(" "));

  const context = await browser.newContext();
  const host = new URL(BASE).hostname;
  await context.addCookies([
    { name: "salon-publik", value: "placeholder-install", domain: host, path: "/", httpOnly: true, sameSite: "Lax" },
    { name: "salon-publik-choice", value: "publik", domain: host, path: "/", httpOnly: true, sameSite: "Lax" },
  ]);
  await context.route("http://evil.test/**", (r) => r.fulfill({ contentType: "text/html", body: r.request().url().endsWith("/a")
    ? `<form id=f method=post action="${BASE}/api/publik/provision"></form><script>f.submit()</script>`
    : `<form id=f method=post enctype="text/plain" action="${BASE}/api/publik/choice"><input name='{"choice":"own_key","x":"' value='"}'></form><script>f.submit()</script>` }));
  const evil = await context.newPage();
  const seen = [];
  evil.on("response", (r) => { if (r.url().startsWith(BASE)) seen.push(r.status()); });
  for (const u of ["http://evil.test/a", "http://evil.test/b"]) {
    await evil.goto(u);
    await evil.waitForURL((x) => x.toString().startsWith(BASE), { timeout: 10_000 }).catch(() => {});
    await evil.waitForTimeout(300);
  }
  check("a real form on another site gets 403 from provision and choice", seen.length === 2 && seen.every((s) => s === 403), seen.join(" "));
  const jar = Object.fromEntries((await context.cookies(BASE)).map((c) => [c.name, c.value]));
  check("a form on another site can't replace this browser's install or switch it to My own key", jar["salon-publik"] === "placeholder-install" && jar["salon-publik-choice"] === "publik", JSON.stringify(jar));
  // Salon itself still reaches its routes from the same browser (same origin passes the check).
  const page = await context.newPage();
  await page.goto(`${BASE}/`);
  const same = await page.evaluate(async () => {
    const choice = await fetch("/api/publik/choice", { method: "POST", headers: { "content-type": "application/json" }, body: '{"choice":"publik"}' });
    const chat = await fetch("/api/publik/chat", { method: "POST", headers: { "content-type": "application/json" }, body: '{"messages":[{"role":"user","content":"hi"}]}' });
    return [choice.status, chat.status];
  });
  check("from Salon itself the same routes pass the check (choice 200; chat 428 for a placeholder install, not 403)", same[0] === 200 && same[1] === 428, same.join(" "));
  await context.close();
}, "9. other sites");

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
