import type { Chat } from "./types";

// Chats live in one localStorage entry that every open tab writes whole. Without a merge, a tab left
// open writes its old list over whatever another tab saved since. No app imports here, so `npm test`
// can run this file directly.

/** Chat id → updatedAt, as storage held them the last time this tab looked. */
export type Seen = Map<string, number>;

export const seenOf = (chats: Chat[]): Seen => new Map(chats.map((c) => [c.id, c.updatedAt]));

/**
 * This tab's chats brought together with what is in storage now.
 * - In both: the one changed most recently.
 * - Only in storage: another tab made it, unless this tab had seen it (then it was deleted here).
 * - Only here: new or changed here, unless this tab saw it in storage unchanged (then another tab deleted it).
 */
export function mergeChats(local: Chat[], seen: Seen, stored: Chat[]): Chat[] {
  const mine = new Map(local.map((c) => [c.id, c]));
  const out: Chat[] = [];
  for (const s of stored) {
    const l = mine.get(s.id);
    mine.delete(s.id);
    if (l) out.push(l.updatedAt >= s.updatedAt ? l : s);
    else if (!seen.has(s.id)) out.push(s);
  }
  for (const l of mine.values()) {
    if (seen.get(l.id) !== l.updatedAt) out.push(l);
  }
  return out.sort((a, b) => b.updatedAt - a.updatedAt);
}

/** The same chats at the same versions, in any order. */
export function sameChats(a: Chat[], b: Chat[]): boolean {
  if (a.length !== b.length) return false;
  const versions = seenOf(a);
  return b.every((c) => versions.get(c.id) === c.updatedAt);
}
