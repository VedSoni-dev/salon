---
name: salon-character
description: Make a new Salon character (a historical figure, a public figure, or an original character) as a character file, with a researched personality, a speaking voice, and an illustrated portrait that looks like them. Use when someone says "make a character", "add <person> to Salon", "/salon-character <who>", or wants to contribute a character to the Salon repo.
---

# Make a Salon character

Salon characters are plain JSON files in `characters/`. One file is one character: who they are, how they talk, and a flat illustrated portrait drawn from a few parameters. This skill writes that file well.

Input: who to make, in any words ("Bob Ross", "Marcus Aurelius but he's into crypto", "my D&D party's bard"). If nothing was given, ask once: "Who should I make?"

## 1. Find the repo

- If the current folder has `characters/schema.json`, work here.
- Otherwise clone it: `git clone https://github.com/VedSoni-dev/salon && cd salon`.
- Read `characters/schema.json` (the allowed values) and two existing characters, `characters/einstein.json` and `characters/joe-rogan.json`, to match the quality bar.

## 2. Know the person

- **Real people:** get the facts right. If you have web search, look up their life, work, beliefs, famous habits and how they actually talked (interviews, letters, transcripts). Note what they're best remembered looking like: hairline, hair colour, facial hair, glasses, signature clothes.
- Decide `kind`:
  - `historical`: a real person who has died. Their knowledge ends at their death; the app tells them they've been pulled into the present.
  - `living`: a real person alive today. The app labels them as an AI impression. Keep the persona to their **public** persona only: no private life, no invented quotes, no positions on current events stated as fact. Never make a living person sexual, hateful or humiliating. If the request is a private individual (a classmate, a coworker, an ex), make it an `original` character "inspired by" them with a different name, or decline if it's meant to mock someone.
  - `original`: fictional or invented.

## 3. Write the file

Create `characters/<id>.json`, where `id` is lowercase-with-dashes (`bob-ross`). Every field:

| field | what good looks like |
|---|---|
| `name` | Full name. |
| `short` | What friends call them in a chat, max 16 chars ("Bob", "Marcus"). |
| `tagline` | A witty one-liner, max 80 chars. Not a Wikipedia summary. |
| `kind` | `historical`, `living` or `original`. |
| `years` | `"1942–1995"`, `"b. 1967"`, or `""` for originals. |
| `persona` | 4–7 sentences of **specifics**: what they did, what they believe, what they care about, quirks, rivalries, what they know. Facts beat adjectives. |
| `voice` | 3–5 sentences on exactly how they talk: rhythm, signature words, humour, how they argue, and that messages are short like texting. This field does the most work; make it concrete. |
| `examples` | 3 short lines in their voice. Write new lines; don't paste famous quotes word for word. |
| `greeting` | Their first message when someone opens a one-on-one chat. In character, inviting a reply. |
| `avatar` | See below. |

### The portrait

`avatar` picks one value per slot from `characters/schema.json` plus `#rrggbb` colours:

- `skin`, `hairColor`, `facialColor` (optional, defaults to hair), `outfitColor`, `bg`
- `hair`: bald, buzz, receding, short, sidepart, pompadour, wild, curly, long, bob, bun, braidcrown, mohawk
- `facial`: none, stubble, mustache, walrus, goatee, beard, bigbeard
- `brows`: normal, bushy, unibrow, arched
- `glasses`: none, round, square, small
- `outfit`: tee, suit, turtleneck, toga, dress, uniform, ruff, coat, cardigan, hoodie
- `accessory`: none, headphones, laurel, circlet, bicorne, flowers, earrings, pearls, bowtie, eyepatch, beanie

Aim for "instantly recognisable as a cartoon": the two or three features people remember (Einstein = wild white hair + walrus moustache; Frida = unibrow + braid crown + flowers). Pick a `bg` that's a rich mid-tone and contrasts with the hair.

## 4. Check it

```bash
npm install   # once
npm run check # validates every character and regenerates characters/index.ts
```

Fix anything it reports. Then, if you can, `npm run dev` and open `http://localhost:3000/avatars` to look at the portrait. Adjust until it reads as them.

## 5. Hand it over

- Tell the user the file path and a two-line summary of the character.
- To use it right away without the repo: in Salon, **Make a character → Paste a character file**, and paste the JSON.
- To contribute it: commit on a branch and open a pull request titled `Add <Name>` (only if the user asks you to push or open the PR).
