import { Fragment } from "react";

// Models emphasise with markdown (*not yet*, **never**). Chat bubbles show plain text, so those
// asterisks used to appear literally. Render the two inline forms; leave everything else as typed.
const EMPH = /((?<![\w*])\*\*[^*\s](?:[^*\n]*?[^*\s])?\*\*(?![\w*])|(?<![\w*])\*[^*\s](?:[^*\n]*?[^*\s])?\*(?![\w*]))/g;

/** A message's text with *italic* and **bold** rendered. Lone or unbalanced asterisks stay as they are. */
export function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split(EMPH).map((part, i) => {
        if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>;
        return part.startsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : <em key={i}>{part.slice(1, -1)}</em>;
      })}
    </>
  );
}

/** The same text with the emphasis markers removed, for one-line previews. */
export const plain = (text: string) => text.replace(EMPH, (m) => (m.startsWith("**") ? m.slice(2, -2) : m.slice(1, -1)));
