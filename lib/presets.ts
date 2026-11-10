/** One-click group chats on the home screen, each with a first message worth sending. */
export const PRESETS: { members: string[]; title: string; starters: string[] }[] = [
  { members: ["einstein", "joe-rogan"], title: "Physics, but make it a podcast", starters: ["Is time travel actually possible?", "Einstein, explain relativity so Joe gets it", "Who would win in a fight: a chimp or a black hole?"] },
  { members: ["steve-jobs", "nikola-tesla", "ada-lovelace"], title: "The product meeting from hell", starters: ["Pitch me the next big invention", "Roast my startup idea: Uber for dogs", "Who's the real genius here?"] },
  { members: ["socrates", "gran"], title: "Two philosophers, one biscuit tin", starters: ["What's the meaning of life?", "Should I text my ex?", "Is it okay to lie to be polite?"] },
  { members: ["cleopatra", "napoleon"], title: "Power couple therapy", starters: ["Who was the better leader?", "How do I win a negotiation for a raise?", "Napoleon, how tall are you really?"] },
  { members: ["frida-kahlo", "shakespeare"], title: "Heartbreak workshop", starters: ["Help me write a breakup text", "Describe my Monday as a tragedy", "What makes art worth it?"] },
  { members: ["captain-vex", "ben-franklin", "marie-curie"], title: "The most qualified heist crew", starters: ["Plan a museum heist (hypothetically)", "We have 24 hours and $100. Go.", "Who's the weakest link on this crew?"] },
];

export const GROUP_STARTERS = ["Introduce yourselves", "Debate: is a hot dog a sandwich?", "What would you do with a smartphone?", "Roast each other, gently"];
export const DM_STARTERS = ["What are you most proud of?", "What would you think of the world today?", "Give me some advice", "Tell me a story nobody knows"];
