import { BUILT_IN } from "@/characters";
import { Avatar } from "@/components/Avatar";

export const metadata = { title: "Salon: every portrait" };

/** Every built-in portrait, big. Handy when adding a character: `npm run dev`, then open /avatars. */
export default function Avatars() {
  return (
    <main className="mx-auto max-w-6xl p-8">
      <h1 className="font-display mb-6 text-4xl">Every portrait</h1>
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 lg:grid-cols-5">
        {BUILT_IN.map((c) => (
          <figure key={c.id} className="flex flex-col items-center gap-2">
            <Avatar spec={c.avatar} size={168} />
            <figcaption className="text-sm font-medium">{c.name}</figcaption>
            <code className="text-xs text-mute">{c.id}.json</code>
          </figure>
        ))}
      </div>
    </main>
  );
}
