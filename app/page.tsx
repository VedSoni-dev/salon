import { getImageProps } from "next/image";
import Link from "next/link";
import { BUILT_IN } from "@/characters";
import { Avatar } from "@/components/Avatar";
import { PublikPitch } from "@/components/PublikGate";
import { ShareLinkForward } from "@/components/ShareLinkForward";
import { Logo } from "@/components/ui";

// The public landing page. No sign-in here: only the software at /app is behind Sign in with publik.

const REPO_URL = "https://github.com/VedSoni-dev/salon";
const LISTING_URL = "https://publikhq.com/salon";

const FEATURES = [
  ["Group chats", "Pick two or more characters and talk to all of them at once. They answer each other, not just you. @mention someone to ask them directly, or press Let them talk and watch."],
  ["14 characters to start", "Einstein, Joe Rogan, Steve Jobs, Cleopatra, Socrates, Frida Kahlo, Nikola Tesla, Marie Curie and more, plus two originals: Gran and Captain Vex."],
  ["Make anyone in one sentence", "Type “Bob Ross, but secretly competitive” and Salon writes their personality, voice and portrait. Tweak anything, then share them with a link."],
  ["Portraits drawn in code", "Every portrait is an SVG drawn from a dozen parameters: Einstein’s hair, Frida’s flower crown, Jobs’s turtleneck. No image model, no photos."],
  ["Nothing stored on a server", "Your chats and characters live in your browser. A shared character rides inside the link itself."],
  ["Your AI, your choice", "Run the characters on a publik plan, or bring your own OpenAI or Anthropic key. Change it any time in Settings."],
] as const;

const KIND_LABEL = { historical: "", living: "AI impression", original: "Original" } as const;

/** One screenshot in light and dark: the browser picks the one that matches its colour scheme. */
function Shot({ name, width, height, alt, sizes, eager, className = "" }: {
  name: string; width: number; height: number; alt: string; sizes: string; eager?: boolean; className?: string;
}) {
  const common = { alt, width, height, sizes };
  const { props: { srcSet: dark } } = getImageProps({ ...common, src: `/media/${name}-dark.jpg` });
  const { props: { srcSet: light, ...img } } = getImageProps({ ...common, src: `/media/${name}-light.jpg`, ...(eager ? { loading: "eager" as const, fetchPriority: "high" as const } : {}) });
  return (
    <picture>
      <source media="(prefers-color-scheme: dark)" srcSet={dark} sizes={sizes} />
      <source srcSet={light} sizes={sizes} />
      <img {...img} alt={alt} className={`block h-auto w-full ${className}`} />
    </picture>
  );
}

function OpenSalon({ className = "" }: { className?: string }) {
  return <Link href="/app" className={`btn btn-primary h-11 rounded-xl px-5 text-[15px] ${className}`}>Open Salon →</Link>;
}

export default function Landing() {
  const featured = BUILT_IN.slice(0, 8);
  return (
    <div className="relative min-h-full overflow-x-clip bg-bg text-fg">
      <ShareLinkForward />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(60%_60%_at_50%_0%,color-mix(in_srgb,var(--accent)_13%,transparent),transparent)]" />

      <header className="relative mx-auto flex max-w-6xl items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2" aria-label="Salon home">
          <Logo size={26} />
          <span className="font-display text-[1.7rem] leading-none">Salon</span>
        </Link>
        <div className="flex-1" />
        <a href={REPO_URL} className="btn btn-ghost px-2 text-mute" title="Salon on GitHub" aria-label="Salon on GitHub">
          <GitHubIcon />
        </a>
        <Link href="/app" className="btn btn-primary">Open Salon →</Link>
      </header>

      <main className="relative">
        <section className="mx-auto max-w-6xl px-4 pb-10 pt-10 sm:px-6 sm:pt-16 lg:px-8">
          <p className="text-sm font-medium text-accent">A free Character.AI alternative</p>
          <h1 className="font-display mt-3 max-w-4xl text-[clamp(2.9rem,8.4vw,6.2rem)] leading-[0.98]">
            Group chats with anyone in history.
          </h1>
          <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-mute sm:text-lg">
            Talk one-on-one with Einstein, or put Einstein and Joe Rogan in the same group chat and watch them go.
            They answer each other, not just you. Make your own characters in one sentence.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <OpenSalon />
            <a href={LISTING_URL} className="btn h-11 rounded-xl px-5 text-[15px]">Get it on publik</a>
            <a href={REPO_URL} className="btn btn-ghost hidden h-11 rounded-xl px-4 text-[15px] sm:inline-flex"><GitHubIcon /> GitHub</a>
          </div>
          <p className="mt-4 text-sm text-mute">Free and open source. Your chats stay in your browser.</p>

          <div className="mt-10 flex items-center gap-4">
            <div className="flex -space-x-3">
              {featured.map((c) => (
                <div key={c.id} className="rounded-full ring-4 ring-[var(--bg)]" title={c.name}>
                  <Avatar spec={c.avatar} size={60} className="size-11 sm:size-[60px]" />
                </div>
              ))}
            </div>
            <span className="hidden text-sm text-mute sm:block">and {BUILT_IN.length - featured.length} more, or anyone you describe</span>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8" aria-label="Screenshot of Salon">
          <figure>
            <div className="overflow-hidden rounded-2xl border border-line bg-panel shadow-[var(--shadow)]">
              <div className="flex items-center gap-1.5 border-b border-line px-3 py-2 sm:px-4 sm:py-2.5">
                <span className="size-2.5 rounded-full bg-line" /><span className="size-2.5 rounded-full bg-line" /><span className="size-2.5 rounded-full bg-line" />
                <span className="mx-auto truncate rounded-md bg-sunk px-3 py-0.5 text-[11px] text-mute sm:text-xs">salon-gc.vercel.app/app</span>
                <span className="w-[38px]" />
              </div>
              <Shot name="home" width={2560} height={1600} eager sizes="(min-width: 1152px) 1088px, 100vw"
                alt="Salon's home screen: one-click group chats like Einstein × Joe Rogan, and a grid of characters to pick from." />
            </div>
            <figcaption className="mt-3 text-sm text-mute">
              The home screen of the app. Pick one character for a private chat, or two or more for a group chat.
            </figcaption>
          </figure>
        </section>

        <section className="mx-auto max-w-6xl px-4 pt-20 sm:px-6 lg:px-8">
          <h2 className="font-display text-4xl sm:text-5xl">What you can do</h2>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(([title, text]) => (
              <div key={title} className="rounded-2xl border border-line bg-panel p-5">
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-mute">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pt-20 sm:px-6 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto]">
            <div className="max-w-xl">
              <h2 className="font-display text-4xl sm:text-5xl">In the chat</h2>
              <p className="mt-4 text-[17px] leading-relaxed text-mute">
                In a group, each character sees the chat from their own seat and decides when to jump in. Every chat says up front that these are AI portrayals, and living people are labelled as an AI impression, not the real person.
              </p>
              <p className="mt-4 text-sm leading-relaxed text-mute">
                The screenshots are the real app on a phone. The group chat is a <strong className="font-semibold text-fg">sample conversation written for this page</strong>; in Salon, the characters write their own replies. The one-on-one opens with Einstein&apos;s own greeting, as every new chat does.
              </p>
              <OpenSalon className="mt-7" />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-5">
              <figure className="max-w-[300px]">
                <p className="mb-2 text-xs font-medium text-mute"><span className="rounded-full border border-line bg-panel px-2 py-0.5">Sample chat</span></p>
                <div className="overflow-hidden rounded-[22px] border border-line shadow-[var(--shadow)] sm:rounded-[28px]">
                  <Shot name="group-chat" width={780} height={1688} sizes="(min-width: 640px) 300px, 45vw"
                    alt="A group chat in Salon with Socrates and Gran, showing a sample conversation written for this page, not real AI replies." />
                </div>
                <figcaption className="mt-2 text-xs leading-snug text-mute">Group chat: Socrates and Gran. Sample lines, written by hand.</figcaption>
              </figure>
              <figure className="max-w-[300px]">
                <p className="mb-2 text-xs font-medium text-mute"><span className="rounded-full border border-line bg-panel px-2 py-0.5">One-on-one</span></p>
                <div className="overflow-hidden rounded-[22px] border border-line shadow-[var(--shadow)] sm:rounded-[28px]">
                  <Shot name="einstein-chat" width={780} height={1688} sizes="(min-width: 640px) 300px, 45vw"
                    alt="A new one-on-one chat with Albert Einstein in Salon: his greeting and suggested first messages." />
                </div>
                <figcaption className="mt-2 text-xs leading-snug text-mute">A new chat with Einstein, with suggested first messages.</figcaption>
              </figure>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pt-20 sm:px-6 lg:px-8">
          <h2 className="font-display text-4xl sm:text-5xl">The cast</h2>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-mute">Fourteen characters to start, each with a portrait drawn by the app itself. Or describe anyone and Salon makes them.</p>
          <ul className="mt-8 grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-2.5 lg:grid-cols-7">
            {BUILT_IN.map((c) => (
              <li key={c.id} className="flex flex-col items-center rounded-2xl border border-line bg-panel px-2 py-3.5 text-center sm:px-3 sm:py-4">
                <Avatar spec={c.avatar} size={64} className="size-14 sm:size-16" />
                <span className="mt-2 text-[13px] font-semibold leading-tight sm:text-sm">{c.name}</span>
                <span className="mt-0.5 text-[11px] text-mute">{KIND_LABEL[c.kind] || c.years}</span>
                <span className="mt-1.5 line-clamp-3 text-xs leading-snug text-mute max-sm:hidden">{c.tagline}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mx-auto max-w-6xl px-4 pt-20 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-line bg-panel p-6 sm:p-10">
            <h2 className="font-display text-3xl sm:text-4xl">Free, because of publik</h2>
            <PublikPitch
              appName="Salon"
              className="mt-4 max-w-2xl text-[16px] leading-relaxed text-mute [&_a]:text-fg [&_a]:underline [&_a]:underline-offset-2 [&_p]:mb-4 [&_.pk-pitch-cta]:font-semibold [&_.pk-pitch-cta]:text-accent [&_.pk-pitch-cta]:no-underline [&_.pk-pitch-cta:hover]:underline"
            />
            <p className="mt-5 text-sm text-mute">Opening Salon asks you to sign in with a free publik account, then how to pay for the AI: a publik plan, or your own API key.</p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-24 text-center sm:px-6 lg:px-8">
          <h2 className="font-display text-[clamp(2.6rem,7vw,4.5rem)] leading-none">Who&apos;s in your group chat?</h2>
          <OpenSalon className="mt-8" />
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-mute sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="flex items-center gap-2 text-fg"><Logo size={18} /> <span className="font-display text-xl leading-none">Salon</span></span>
            <a href={REPO_URL} className="inline-flex items-center gap-1.5 hover:text-fg"><GitHubIcon size={15} /> Source on GitHub</a>
            <a href={LISTING_URL} className="hover:text-fg">publik listing</a>
            <span>MIT license</span>
          </div>
          <p className="max-w-3xl text-xs leading-relaxed">
            Characters are AI portrayals, made for fun, and they get facts wrong sometimes. Living people like Joe Rogan appear as a labelled AI impression, not the real person. Salon is not affiliated with Character.AI or with anyone portrayed.
          </p>
        </div>
      </footer>
    </div>
  );
}

function GitHubIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.3-3.4-1.3-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.6 2.4 1.1 3 .8.1-.7.4-1.1.6-1.4-2.2-.2-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.8 1a9.6 9.6 0 0 1 5 0c1.9-1.3 2.8-1 2.8-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.4 4.7-4.6 5 .4.3.7.9.7 1.9V21c0 .3.2.6.7.5A10 10 0 0 0 12 2z" />
    </svg>
  );
}
