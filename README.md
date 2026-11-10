<h1 align="center">Salon</h1>

<p align="center"><b>Group chats with anyone in history.</b><br>
Talk one-on-one with Einstein, or put Einstein and Joe Rogan in a group chat and watch them argue about time travel. Make any character in one sentence. Free and open source.</p>

<p align="center">
  <a href="https://salon-gc.vercel.app"><b>Open Salon</b></a> ·
  <a href="#make-your-own-character">Make a character</a> ·
  <a href="#use-it-from-claude-code-or-codex">Use it from your terminal</a> ·
  <a href="#run-it-yourself">Run it yourself</a>
</p>

A free, open-source alternative to Character.AI with group chats built in.

- **Group chats.** Pick two or more characters and talk to all of them at once. They answer each other, not just you. `@name` someone to ask them directly, or press **Let them talk** and watch the conversation run without you.
- **14 characters to start:** Albert Einstein, Joe Rogan, Steve Jobs, Cleopatra, Socrates, Frida Kahlo, Nikola Tesla, Marie Curie, Ada Lovelace, Benjamin Franklin, Napoleon, Shakespeare, plus two originals (Gran, and Captain Vex the space pirate).
- **Portraits that look like them.** Every character gets a flat illustrated portrait built from their real signature features: Einstein's hair and moustache, Frida's unibrow and flower crown, Jobs's turtleneck and round glasses. Drawn as SVG from a dozen parameters, so no image model, no photos and no likeness scraping.
- **Make anyone in one sentence.** Type "Bob Ross, but secretly competitive" and Salon writes their personality, voice and portrait. Tweak anything, then chat. Share them with a link: the whole character rides in the URL, nothing is stored on a server.
- **Nothing to sign up for.** Chats and characters live in your browser.

## Make your own character

Three ways, easiest first:

1. **On the site:** "Make anyone", describe them, save.
2. **With the skill:** in Claude Code or Codex, run the `salon-character` skill (`skills/salon-character/SKILL.md`). It researches the person, writes `characters/<id>.json`, picks a portrait, and runs the checker.
3. **By hand:** copy `characters/einstein.json`, edit, run `npm run check`.

Characters are plain JSON:

```json
{
  "id": "einstein",
  "name": "Albert Einstein",
  "short": "Einstein",
  "tagline": "Physicist, violinist, professional daydreamer.",
  "kind": "historical",
  "years": "1879–1955",
  "persona": "Who they are: life, beliefs, what they know…",
  "voice": "How they talk: rhythm, signature words, message length…",
  "examples": ["A few lines in their voice"],
  "greeting": "Ah, a visitor! Sit, sit…",
  "avatar": { "skin": "#f1c9a5", "hair": "wild", "hairColor": "#eeeeea", "facial": "walrus", "brows": "bushy", "glasses": "none", "outfit": "cardigan", "outfitColor": "#7b6a58", "accessory": "none", "bg": "#2f4a6d" }
}
```

Allowed portrait values are in [`characters/schema.json`](characters/schema.json). `npm run dev` then open `/avatars` to see every portrait. Pull requests with new characters are welcome; `npm run check` must pass.

## Use it from Claude Code or Codex

The repo ships two agent skills in [`skills/`](skills):

| skill | what it does |
|---|---|
| [`salon-chat`](skills/salon-chat/SKILL.md) | Chat with the characters right in your terminal, one-on-one or as a group: `/salon-chat einstein joe-rogan`. Runs on whatever plan your agent already uses. |
| [`salon-character`](skills/salon-character/SKILL.md) | Make a new character file, researched and checked. |

Install them by copying the folders into your agent's skills directory:

```bash
git clone https://github.com/VedSoni-dev/salon
cp -r salon/skills/* ~/.claude/skills/      # Claude Code
cp -r salon/skills/* ~/.codex/skills/       # Codex
```

## Where the AI comes from

The website runs on [publik API](https://publikhq.com) by default: no key to paste, priced per use from a publik balance (linking a publik account gives a little free use). You can switch to your own OpenAI key (or any OpenAI-compatible endpoint: OpenRouter, Ollama…) or your own Anthropic key in Settings; your key stays in your browser and goes straight to the provider.

How a group chat works: each character gets their own system prompt (persona, voice, the other people in the room) and sees the chat from their seat, with their own lines as the assistant's turns and everyone else's labelled by name. Who answers is decided by `@mentions` first, then (for three or more) a small fast model call that picks who'd have the best reaction. See [`lib/engine.ts`](lib/engine.ts).

## Honest limits

- Characters are AI portrayals. They get facts wrong sometimes, and their opinions are a model's guess at the person's, not the person's.
- Real living people (like Joe Rogan) are labelled as an AI impression everywhere they appear, and their prompt rules out invented private details, fake quotes and stances on current news.
- Chats are stored in your browser only. Clear your site data and they're gone; there's no sync between devices yet.
- No voice yet.

## Run it yourself

```bash
git clone https://github.com/VedSoni-dev/salon
cd salon
npm install
npm run dev     # http://localhost:3000
```

It works with no configuration: visitors use their own OpenAI or Anthropic key. To offer publik API, set `PUBLIK_APP_TOKEN` (see [`.env.example`](.env.example)). Deploys to Vercel as-is.

Stack: Next.js (App Router), React, Tailwind, TypeScript. No database.

## License

MIT
