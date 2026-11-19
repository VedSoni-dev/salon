// Turn-taking tests. Run: npm test  (Node 23+ reads the .ts file directly.)
import assert from "node:assert/strict";
import { test } from "node:test";
import { mentioned, nextAuto, quickSpeakers } from "../lib/turns.ts";

const ch = (id, name, short) => ({ id, name, short });
const tesla = ch("tesla", "Nikola Tesla", "Tesla");
const marie = ch("marie", "Marie Curie", "Marie");
const ada = ch("ada", "Ada Lovelace", "Ada");
const trio = [tesla, marie, ada];
const chat = (...lines) => ({ messages: lines.map(([from, text], i) => ({ id: String(i), from, text })) });
const first = () => 0.99; // never take the "second quietest" branch

// Real lines from the 2026-11-19 run, where Ada waited six turns and Tesla then vanished.
const REAL = [
  ["user", "What's the greatest invention ever?"],
  ["tesla", "The rotating magnetic field — the very heart of alternating current."],
  ["marie", "A spinning field is very fine, Nikola. But I would choose the laboratory notebook."],
  ["tesla", "A fair blow, Marie. Yet I built entire machines in my mind."],
  ["marie", "The mind is a generous laboratory, Nikola. Paper is less kind. Ada will agree; she had to write for a machine that did not yet exist."],
  ["tesla", "Paper cannot feel a vibration in the bearings at three in the morning, Marie. Ada, whose side are you on?"],
];

test("a hand-off beats the name of the person being answered", () => {
  assert.equal(nextAuto(chat(...REAL), trio, first).id, "ada");
  assert.equal(nextAuto(chat(...REAL.slice(0, 5)), trio, first).id, "ada"); // "Ada will agree"
});

test("naming only the person you answer still gets their reply", () => {
  assert.equal(nextAuto(chat(...REAL.slice(0, 3)), trio, first).id, "tesla");
});

test("after three lines between two people, the third gets the floor", () => {
  const duet = chat(["user", "go"], ["ada", "Marie, no."], ["marie", "Ada, yes."], ["ada", "Marie, no."]);
  assert.equal(nextAuto(duet, trio, first).id, "tesla");
  const short = chat(["user", "go"], ["ada", "Marie, no."], ["marie", "Ada, yes."]);
  assert.equal(nextAuto(short, trio, first).id, "ada");
});

test("the human speaking resets the count", () => {
  const c = chat(["ada", "Marie, no."], ["marie", "Ada, yes."], ["user", "hm"], ["marie", "Ada, yes."]);
  assert.equal(nextAuto(c, trio, first).id, "ada");
});

test("nobody is shut out when every reply names the person it answers", () => {
  for (const size of [3, 4, 5]) {
    const members = [tesla, marie, ada, ch("soc", "Socrates", "Socrates"), ch("gran", "Gran", "Gran")].slice(0, size);
    for (let seed = 0; seed < 50; seed++) {
      let s = seed + 1;
      const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
      const lines = [["user", "go"], [members[0].id, "Well."]];
      for (let i = 0; i < 40; i++) {
        const c = { messages: lines.map(([from, text], n) => ({ id: String(n), from, text })) };
        const next = nextAuto(c, members, rand);
        const prev = members.find((m) => m.id === lines[lines.length - 1][0]);
        assert.notEqual(next.id, prev.id, "never the same speaker twice in a row");
        lines.push([next.id, `Not so, ${prev.short}.`]);
      }
      const speakers = lines.slice(1).map(([from]) => from);
      for (let i = 0; i + 2 * size <= speakers.length; i++) {
        const window = new Set(speakers.slice(i, i + 2 * size));
        assert.equal(window.size, size, `size ${size} seed ${seed}: someone silent for ${2 * size} turns`);
      }
    }
  }
});

test("two people just alternate; one person keeps talking", () => {
  const two = [tesla, marie];
  const c = chat(["user", "go"], ["tesla", "Marie."], ["marie", "Nikola."], ["tesla", "Marie."], ["marie", "Nikola."]);
  assert.equal(nextAuto(c, two, first).id, "tesla");
  assert.equal(nextAuto(c, [marie], first).id, "marie");
  assert.equal(nextAuto({ messages: [] }, trio, first).id, "tesla");
});

test("mentions: names count, common words don't", () => {
  const jobs = ch("jobs", "Steve Jobs", "Jobs");
  assert.deepEqual(mentioned("what jobs will AI kill", [jobs]), []);
  assert.deepEqual(mentioned("@jobs thoughts?", [jobs]).map((m) => m.id), ["jobs"]);
  assert.deepEqual(mentioned("Ada, then Nikola", trio).map((m) => m.id), ["ada", "tesla"]);
  assert.deepEqual(quickSpeakers("Marie, your view?", trio).map((m) => m.id), ["marie"]);
  assert.equal(quickSpeakers("what is the best invention", trio), null);
});
