import schema from "@/characters/schema.json";

export type Kind = "historical" | "living" | "original";

export interface AvatarSpec {
  skin: string;
  hair: string;
  hairColor: string;
  facial: string;
  /** Defaults to hairColor. */
  facialColor?: string;
  brows: string;
  glasses: string;
  outfit: string;
  outfitColor: string;
  accessory: string;
  bg: string;
}

export interface Character {
  id: string;
  name: string;
  /** What they're called in the chat: "Einstein", "Joe". */
  short: string;
  tagline: string;
  kind: Kind;
  /** "1879–1955", "b. 1967", or "" for originals. */
  years: string;
  /** Who they are: background, beliefs, what they know, what they care about. */
  persona: string;
  /** How they talk: rhythm, words they reach for, habits, length. */
  voice: string;
  /** A few lines in their voice, used as style examples. */
  examples: string[];
  greeting: string;
  avatar: AvatarSpec;
  /** Set on characters made in this browser. */
  custom?: boolean;
}

export interface Message {
  id: string;
  /** "user", or a character id. */
  from: string;
  text: string;
  at: number;
}

export interface Chat {
  id: string;
  members: string[];
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export type ProviderId = "publik" | "openai" | "anthropic";

export interface Settings {
  provider: ProviderId;
  userName: string;
  openaiKey: string;
  openaiModel: string;
  openaiBase: string;
  anthropicKey: string;
  anthropicModel: string;
  publikTier: "publik-fast" | "publik-balanced" | "publik-smart";
}

export const OPTIONS = schema.avatar as Record<keyof Omit<AvatarSpec, "skin" | "hairColor" | "facialColor" | "outfitColor" | "bg">, string[]>;
export const KINDS = schema.kind as Kind[];
