// Two-tab merge tests. Run: npm test  (Node 23+ reads the .ts file directly.)
import assert from "node:assert/strict";
import { test } from "node:test";
import { mergeChats, sameChats, seenOf } from "../lib/sync.ts";

const c = (id, updatedAt, note = "") => ({ id, updatedAt, note, members: [], messages: [] });
const ids = (xs) => xs.map((x) => `${x.id}@${x.updatedAt}`).join(" ");

test("a chat another tab made is kept when this tab saves", () => {
  const local = [c("a", 5)];
  const merged = mergeChats(local, seenOf([c("a", 1)]), [c("b", 4), c("a", 1)]);
  assert.equal(ids(merged), "a@5 b@4");
});

test("the newer copy of a chat wins, whichever tab has it", () => {
  assert.equal(mergeChats([c("a", 2, "mine")], seenOf([c("a", 2)]), [c("a", 9, "theirs")])[0].note, "theirs");
  assert.equal(mergeChats([c("a", 9, "mine")], seenOf([c("a", 2)]), [c("a", 3, "theirs")])[0].note, "mine");
});

test("a chat deleted in this tab is not brought back from storage", () => {
  const seen = seenOf([c("a", 1), c("b", 2)]);
  assert.equal(ids(mergeChats([c("a", 1)], seen, [c("b", 2), c("a", 1)])), "a@1");
  // even if the other tab wrote to it in the meantime
  assert.equal(ids(mergeChats([c("a", 1)], seen, [c("b", 7), c("a", 1)])), "a@1");
});

test("a chat deleted in another tab is dropped here, unless it changed here since", () => {
  const seen = seenOf([c("a", 1), c("b", 2)]);
  assert.equal(ids(mergeChats([c("a", 1), c("b", 2)], seen, [c("a", 1)])), "a@1");
  assert.equal(ids(mergeChats([c("a", 1), c("b", 6)], seen, [c("a", 1)])), "b@6 a@1");
});

test("a chat started here and not saved yet survives another tab's save", () => {
  assert.equal(ids(mergeChats([c("new", 8), c("a", 1)], seenOf([c("a", 1)]), [c("a", 1), c("b", 3)])), "new@8 b@3 a@1");
});

test("nothing to merge: empty storage and an empty tab", () => {
  assert.deepEqual(mergeChats([], new Map(), []), []);
});

test("sameChats ignores order and notices a newer version", () => {
  assert.ok(sameChats([c("a", 1), c("b", 2)], [c("b", 2), c("a", 1)]));
  assert.ok(!sameChats([c("a", 1)], [c("a", 2)]));
  assert.ok(!sameChats([c("a", 1)], [c("a", 1), c("b", 2)]));
});
