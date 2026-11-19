import type { Character, Chat } from "./types";

// Turn-taking: who answers the human, and who speaks next when the characters carry on alone.
// No app imports here, so `npm test` can run this file directly.

/** How many lines two characters may trade before a third is let in. */
const DUET = 3;

export const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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

/**
 * Who speaks next when the characters keep talking on their own.
 * A reply nearly always names the person it answers, so "whoever was named first" turns any
 * three-way chat into two people trading lines while the third never gets in.
 */
export function nextAuto(chat: Chat, members: Character[], rand: () => number = Math.random): Character {
  const msgs = chat.messages;
  const last = msgs[msgs.length - 1];
  const pool = members.filter((m) => m.id !== last?.from);
  if (!pool.length) return members[0];
  const lastSpoke = (id: string) => {
    for (let i = msgs.length - 1; i >= 0; i--) if (msgs[i].from === id) return i;
    return -1;
  };
  const quietFirst = (xs: Character[]) => [...xs].sort((a, b) => lastSpoke(a.id) - lastSpoke(b.id));

  // Who has spoken since the human last did, newest first.
  const run: string[] = [];
  for (let i = msgs.length - 1; i >= 0 && msgs[i].from !== "user"; i--) if (msgs[i].from !== "system") run.push(msgs[i].from);

  // Two people have traded three lines: someone else gets the floor, whoever has waited longest.
  const pair = new Set(run.slice(0, DUET));
  if (run.length >= DUET && pair.size === 2) {
    const waiting = pool.filter((m) => !pair.has(m.id));
    if (waiting.length) return quietFirst(waiting)[0];
  }

  if (last && last.from !== "user" && last.from !== "system") {
    const named = mentioned(last.text, pool);
    // "A fair blow, Marie. … Ada, whose side are you on?" answers Marie and hands over to Ada.
    const handedTo = named.filter((m) => m.id !== run[1]);
    if (handedTo.length) return handedTo[0];
    if (named.length) return named[0];
  }
  const sorted = quietFirst(pool);
  // Mostly the quietest, sometimes the second quietest, so it doesn't feel like a rota.
  return sorted.length > 1 && rand() < 0.3 ? sorted[1] : sorted[0];
}
