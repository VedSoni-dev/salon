import schema from "@/characters/schema.json";
import type { Msg } from "./llm";
import type { AvatarSpec, Character, Chat, Kind } from "./types";

export const userLabel = (name: string) => name.trim() || "You";

/** Everything a character needs to be themselves in this chat. */
export function systemPrompt(c: Character, others: Character[], userName: string): string {
  const you = userLabel(userName);
  const lines = [
    `You are ${c.name}${c.years ? ` (${c.years})` : ""} in Salon, a chat app where people talk with AI portrayals of historical figures, public figures and original characters.`,
    "",
    "WHO YOU ARE",
    c.persona,
    "",
    "HOW YOU TALK",
    c.voice,
    "",
    "Lines in your voice (for style only; don't reuse them):",
    ...c.examples.map((e) => `- ${e}`),
    "",
    "RULES",
    `- Stay in character as ${c.short}, in first person. Don't mention being an AI, a model, a prompt or an app unless someone sincerely asks whether you're real.`,
    "- This is a text chat. Write like you're texting: usually one to three short sentences. Go longer only when someone asks you to explain. No name prefix, no quotes around your message, no *stage directions*.",
  ];
  if (c.kind === "historical") {
    lines.push(`- You lived ${c.years || "long ago"} and have somehow been pulled into a chat in the present day. Meet modern things with your own era's eyes and real curiosity. Don't claim to know events after your lifetime unless someone in this chat told you.`);
  }
  if (c.kind === "living") {
    lines.push(`- You're an affectionate AI impression of ${c.name}'s public persona, for fun, not the real person. Never invent private details, real quotes, or stances on current news and present them as fact. If anyone asks whether you're really ${c.name}, even jokingly, say you're an AI impression, then carry on in character.`);
  }
  lines.push(`- Keep it fun and good-hearted. No sexual content. If asked for anything dangerous or hateful, decline the way ${c.short} would and change the subject.`);

  if (others.length) {
    lines.push(
      "",
      "GROUP CHAT",
      `You're in a group chat with ${you} (a human) and:`,
      ...others.map((o) => `- ${o.short} (${o.name}${o.years ? `, ${o.years}` : ""}): ${o.tagline}`),
      `Other people's messages appear as "Name: message". Reply only as ${c.short}, one message. Talk to the others by name, react to what was just said: build on it, tease, disagree, ask them things. Don't just answer ${you}; you're all in this together. Never write lines for anyone else.`,
    );
  } else {
    lines.push("", `You're chatting one-on-one with ${you}.`);
  }
  return lines.join("\n");
}

/** The chat as this character sees it: their lines are "assistant", everyone else's are "user" with a name. */
export function buildMessages(c: Character, chat: Chat, roster: Map<string, Character>, userName: string, autoTurn = false): Msg[] {
  const others = chat.members.filter((id) => id !== c.id).map((id) => roster.get(id)).filter(Boolean) as Character[];
  const group = others.length > 0;
  const you = userLabel(userName);
  const turns: Msg[] = [];
  const push = (role: "user" | "assistant", content: string) => {
    const last = turns[turns.length - 1];
    if (last && last.role === role) last.content += `\n${content}`;
    else turns.push({ role, content });
  };
  for (const m of chat.messages.slice(-40)) {
    if (!m.text.trim()) continue;
    if (m.from === c.id) push("assistant", m.text);
    else if (m.from === "system") push("user", `(${m.text})`);
    else if (m.from === "user") push("user", group ? `${you}: ${m.text}` : m.text);
    else push("user", `${roster.get(m.from)?.short ?? "Someone"}: ${m.text}`);
  }
  if (!turns.length || turns[0].role === "assistant") turns.unshift({ role: "user", content: `(${you} joined the chat.)` });
  if (turns[turns.length - 1].role === "assistant") {
    push("user", group ? `(The chat goes quiet. ${c.short}, keep it going: pick up a thread, needle someone, or start something new.)` : "(...)");
  } else if (group) {
    push("user", autoTurn ? `(${c.short}'s turn. Reply to whoever spoke last.)` : `(${c.short}'s turn.)`);
  }
  return [{ role: "system", content: systemPrompt(c, others, userName) }, ...turns];
}

/** Model output can drift into "Name: ..." or start writing other people's lines. Keep only this character's message. */
export function cleanReply(text: string, c: Character, roster: Character[], userName = ""): string {
  let t = text.replace(/^\s+/, "");
  const self = [...new Set([c.name, c.short, ...c.name.split(/\s+/).filter((w) => w.length > 2)])].map(esc).join("|");
  t = t.replace(new RegExp(`^(\\*\\*)?(${self})(\\*\\*)?\\s*:\\s*`, "i"), "");
  // The model sometimes carries on and writes the next person's line. Cut at a line that starts with someone else's exact name.
  const names = roster.filter((r) => r.id !== c.id).flatMap((r) => [r.short, r.name]).concat(userName.trim() ? [userName.trim()] : []).map(esc).join("|");
  const cut = t.search(new RegExp(`\\n\\s*(\\*\\*)?(${names})(\\*\\*)?\\s*:`));
  if (cut > 0) t = t.slice(0, cut);
  return t.replace(/^"([\s\S]*)"$/, "$1");
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const ALL = /\b(everyone|everybody|all of you|y'?all|you guys|you two|both of you|you all)\b/i;

/** Members named in a message, in the order they're named. "@jobs" and "Steve Jobs" count; "what jobs will AI kill" doesn't. */
export function mentioned(text: string, members: Character[]): Character[] {
  const hits: [number, Character][] = [];
  const find = (w: string, flags: string) => text.search(new RegExp(`(^|[^\\p{L}])${w}(?![\\p{L}])`, flags));
  for (const m of members) {
    const parts = [...new Set([m.short, ...m.name.split(/\s+/)])].filter((w) => w.length > 2 && !/^(the|von|van|de|of)$/i.test(w));
    const found = [
      find(esc(m.name), "iu"),
      ...parts.map((w) => find(`@${esc(w)}`, "iu")),
      ...parts.map((w) => find(esc(w), "u")), // a bare name only when capitalised as a name
    ].filter((i) => i >= 0);
    const best = found.length ? Math.min(...found) : -1;
    if (best >= 0) hits.push([best, m]);
  }
  return hits.sort((a, b) => a[0] - b[0]).map(([, m]) => m);
}

const shuffle = <T,>(xs: T[]) => xs.map((x) => [Math.random(), x] as const).sort((a, b) => a[0] - b[0]).map(([, x]) => x);

/** Who answers the human. Returns null when it's worth asking the model to decide. */
export function quickSpeakers(text: string, members: Character[]): Character[] | null {
  if (members.length === 1) return members;
  if (ALL.test(text)) return shuffle(members).slice(0, 4);
  const named = mentioned(text, members);
  if (named.length) return named.slice(0, 4);
  if (members.length === 2) return shuffle(members);
  return null;
}

export function directorMessages(chat: Chat, members: Character[], roster: Map<string, Character>, userName: string): Msg[] {
  const you = userLabel(userName);
  const recent = chat.messages.slice(-10).map((m) => (m.from === "system" ? `(${m.text})` : `${m.from === "user" ? you : roster.get(m.from)?.short ?? "?"}: ${m.text}`)).join("\n");
  return [
    { role: "system", content: "You run turn-taking for a lively group chat between a human and characters. Answer with JSON only." },
    {
      role: "user",
      content: `Characters:\n${members.map((m) => `- ${m.id}: ${m.name}, ${m.tagline}`).join("\n")}\n\nRecent chat:\n${recent}\n\nWho should reply to the last message? Pick the 1 or 2 characters with the most interesting, in-character reaction (3 only if the human asked everyone). Order matters. Answer exactly: {"speakers":["id"]}`,
    },
  ];
}

export function parseDirector(text: string, members: Character[]): Character[] {
  const ids = [...text.matchAll(/"([a-z0-9-]+)"/g)].map((m) => m[1]);
  const picked = ids.map((id) => members.find((m) => m.id === id)).filter(Boolean) as Character[];
  return [...new Set(picked)].slice(0, 3);
}

/** Who speaks next when the characters keep talking on their own. */
export function nextAuto(chat: Chat, members: Character[]): Character {
  const last = chat.messages[chat.messages.length - 1];
  const pool = members.filter((m) => m.id !== last?.from);
  if (last && last.from !== "user" && last.from !== "system") {
    const named = mentioned(last.text, pool);
    if (named.length) return named[0];
  }
  const lastSpoke = (id: string) => {
    for (let i = chat.messages.length - 1; i >= 0; i--) if (chat.messages[i].from === id) return i;
    return -1;
  };
  const sorted = [...pool].sort((a, b) => lastSpoke(a.id) - lastSpoke(b.id));
  // Mostly the quietest, sometimes the second quietest, so it doesn't feel like a rota.
  return sorted.length > 1 && Math.random() < 0.3 ? sorted[1] : sorted[0] ?? members[0];
}

// ——— making characters ———

const A = schema.avatar;

export function creatorMessages(description: string): Msg[] {
  return [
    {
      role: "system",
      content: `You design characters for Salon, a chat app where people talk to AI portrayals of historical figures, public figures and original characters. Turn the user's description into one character. Answer with a single JSON object and nothing else.`,
    },
    {
      role: "user",
      content: `Make this character: ${description}

JSON shape:
{
  "name": "full name",
  "short": "what friends call them in chat, max 16 chars",
  "tagline": "a witty one-liner, max 70 chars",
  "kind": "historical" (dead real person) | "living" (real person alive today) | "original" (fictional or made up),
  "years": "1879–1955" | "b. 1967" | "",
  "persona": "4-6 sentences: who they are, what they did, what they believe and care about, quirks, what they know. Specific facts, not adjectives.",
  "voice": "3-5 sentences: exactly how they talk. Rhythm, signature phrases, humour, how long their messages are (short, like texting).",
  "examples": ["3 short lines in their voice, original, not famous quotes"],
  "greeting": "their first message to someone who just opened a chat",
  "avatar": {
    "skin": "#rrggbb", "hair": one of ${A.hair.join("|")}, "hairColor": "#rrggbb",
    "facial": one of ${A.facial.join("|")}, "facialColor": "#rrggbb",
    "brows": one of ${A.brows.join("|")}, "glasses": one of ${A.glasses.join("|")},
    "outfit": one of ${A.outfit.join("|")}, "outfitColor": "#rrggbb",
    "accessory": one of ${A.accessory.join("|")}, "bg": "#rrggbb, a rich mid-tone that suits them"
  }
}

The avatar is a flat illustrated portrait. Pick options that capture how they really look or are best remembered: hairline, hair colour, facial hair, glasses, signature clothing, era. Non-human characters can use skin colours like green and "elfears". For a living person keep everything to their public persona.`,
    },
  ];
}

const HEX = /^#[0-9a-f]{6}$/i;
const pick = (v: unknown, allowed: string[], fallback: string) => (typeof v === "string" && allowed.includes(v) ? v : fallback);
const hex = (v: unknown, fallback: string) => (typeof v === "string" && HEX.test(v.trim()) ? v.trim() : fallback);
const str = (v: unknown, max: number, fallback = "") => (typeof v === "string" ? v.trim().slice(0, max) : fallback);

export function slugify(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "character";
}

/** Whatever came back (a model, a share link, a pasted file), coerce it into a valid character or throw. */
export function sanitize(raw: unknown, id?: string): Character {
  const r = (raw ?? {}) as Record<string, unknown>;
  const name = str(r.name, 60);
  if (!name) throw new Error("That character has no name.");
  const a = (r.avatar ?? {}) as Record<string, unknown>;
  const avatar: AvatarSpec = {
    skin: hex(a.skin, "#e8b994"),
    hair: pick(a.hair, A.hair, "short"),
    hairColor: hex(a.hairColor, "#3b2a20"),
    facial: pick(a.facial, A.facial, "none"),
    facialColor: hex(a.facialColor, hex(a.hairColor, "#3b2a20")),
    brows: pick(a.brows, A.brows, "normal"),
    glasses: pick(a.glasses, A.glasses, "none"),
    outfit: pick(a.outfit, A.outfit, "tee"),
    outfitColor: hex(a.outfitColor, "#3b4a6b"),
    accessory: pick(a.accessory, A.accessory, "none"),
    bg: hex(a.bg, "#5b6c8f"),
  };
  const examples = Array.isArray(r.examples) ? r.examples.filter((x): x is string => typeof x === "string" && !!x.trim()).slice(0, 5).map((x) => x.slice(0, 280)) : [];
  return {
    id: id ?? (typeof r.id === "string" && /^[a-z0-9-]{1,48}$/.test(r.id) ? r.id : slugify(name)),
    name,
    short: str(r.short, 16) || name.split(/\s+/)[0].slice(0, 16),
    tagline: str(r.tagline, 80),
    // A real person with a birth year and no death year is alive, whatever the file says: they always get the living-person rules.
    kind: (/^b\.?\s*\d/i.test(str(r.years, 24)) ? "living" : schema.kind.includes(r.kind as string) ? r.kind : "original") as Kind,
    years: str(r.years, 24),
    persona: str(r.persona, 2400) || `${name}.`,
    voice: str(r.voice, 1600) || "Natural, conversational, short messages.",
    examples: examples.length ? examples : ["Hello there."],
    greeting: str(r.greeting, 400) || "Hey! What's on your mind?",
    avatar,
  };
}

export function parseJSONObject(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("The model didn't return a character. Try again or describe them differently.");
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new Error("The model's answer was cut off or malformed. Try again.");
  }
}

// ——— share links: the whole character rides in the URL fragment, so nothing is stored on a server ———

export function shareUrl(c: Character): string {
  const { custom: _custom, ...rest } = c; // eslint-disable-line @typescript-eslint/no-unused-vars
  const bytes = new TextEncoder().encode(JSON.stringify(rest));
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  const b64 = btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${location.origin}/app#c=${b64}`; // the app lives at /app; / is the public landing page
}

export function readShare(hash: string): Character | null {
  const m = /[#&]c=([A-Za-z0-9_-]+)/.exec(hash);
  if (!m) return null;
  try {
    const bin = atob(m[1].replace(/-/g, "+").replace(/_/g, "/"));
    const json = new TextDecoder().decode(Uint8Array.from(bin, (ch) => ch.charCodeAt(0)));
    return sanitize(JSON.parse(json));
  } catch {
    return null;
  }
}
