import type { Character, Chat, Settings } from "./types";

const CHATS = "salon:chats:v1";
const CUSTOM = "salon:characters:v1";
const SETTINGS = "salon:settings:v1";

export const DEFAULT_SETTINGS: Settings = {
  provider: "openai",
  userName: "",
  openaiKey: "",
  openaiModel: "",
  openaiBase: "https://api.openai.com/v1",
  anthropicKey: "",
  anthropicModel: "claude-haiku-5-5",
  publikTier: "publik-balanced",
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export const loadChats = (): Chat[] =>
  read<Chat[]>(CHATS, []).filter((c) => c && Array.isArray(c.messages) && Array.isArray(c.members)).sort((a, b) => b.updatedAt - a.updatedAt);
export const saveChats = (chats: Chat[]) => write(CHATS, chats.slice(0, 100));

export const loadCustom = (): Character[] => read<Character[]>(CUSTOM, []).filter((c) => c && c.id && c.avatar);
export const saveCustom = (list: Character[]) => write(CUSTOM, list);

export const loadSettings = (): Settings => ({ ...DEFAULT_SETTINGS, ...read<Partial<Settings>>(SETTINGS, {}) });
export const saveSettings = (s: Settings) => write(SETTINGS, s);

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
