// Local inbox data and pure logic, shared by the page and the MCP route. Messages stay in the browser.

export type MessageState = "New" | "Read";
export type Message = { id: string; name: string; email: string; subject: string; body: string; at: number; state: MessageState };
export type Filter = "All" | MessageState;
export type Draft = { name: string; email: string; subject: string; body: string };

export const STORAGE_KEY = "contact-forms-v2";
export const FILTERS: Filter[] = ["All", "New", "Read"];

// A fixed date: a module-level Date.now() differed between the server render and the browser.
export const SEED: Message[] = [
  {
    id: "seed",
    name: "Mina Park",
    email: "mina@example.com",
    subject: "A question about the work",
    body: "I found the project shelf and would like to know how you choose the next experiment.",
    at: Date.UTC(2026, 9, 1, 9, 0),
    state: "New",
  },
];

function isMessage(value: unknown): value is Message {
  if (!value || typeof value !== "object") return false;
  const m = value as Record<string, unknown>;
  return (
    ["id", "name", "email", "subject", "body"].every((key) => typeof m[key] === "string") &&
    typeof m.at === "number" &&
    Number.isFinite(m.at) &&
    (m.state === "New" || m.state === "Read")
  );
}

// Stored data is untrusted: anything that is not an array of well-formed messages is ignored (null).
export function parseMessages(raw: string | null): Message[] | null {
  if (raw === null) return null;
  try {
    const data: unknown = JSON.parse(raw);
    return Array.isArray(data) ? data.filter(isMessage) : null;
  } catch {
    return null;
  }
}

export function filterMessages(messages: Message[], filter: Filter): Message[] {
  return messages.filter((message) => filter === "All" || message.state === filter);
}

// The open letter is the selected message if the current filter shows it, else the first visible one.
export function pickActive(visible: Message[], selectedId: string): Message | undefined {
  return visible.find((message) => message.id === selectedId) ?? visible[0];
}

export function addMessage(messages: Message[], draft: Draft, id: string, now: number): Message[] {
  const clean = {
    name: draft.name.trim(),
    email: draft.email.trim(),
    subject: draft.subject.trim(),
    body: draft.body.trim(),
  };
  if (!clean.name || !clean.email || !clean.subject || !clean.body) return messages;
  return [{ id, ...clean, at: now, state: "New" }, ...messages];
}

export function markRead(messages: Message[], id: string): Message[] {
  return messages.map((message) => (message.id === id && message.state !== "Read" ? { ...message, state: "Read" } : message));
}

export function removeMessage(messages: Message[], id: string): Message[] {
  return messages.filter((message) => message.id !== id);
}

/**
 * Where a removed message sat in the stored list (its neighbours' ids) and when it was removed, so Undo can find its
 * place again: messages saved after the removal went on top and would shift a bare index.
 */
export type Neighbours = { prevId?: string; nextId?: string; removedAt?: number };

/**
 * Puts a removed message back (Undo), next to its old neighbours when they are still listed, else at its old index
 * counted below the messages saved since the removal; a message already back stays single. (deeplinks pattern)
 */
export function restoreMessage(messages: Message[], message: Message, index: number, neighbours: Neighbours = {}): Message[] {
  if (messages.some((item) => item.id === message.id)) return messages;
  const prevAt = neighbours.prevId ? messages.findIndex((item) => item.id === neighbours.prevId) : -1;
  const nextAt = neighbours.nextId ? messages.findIndex((item) => item.id === neighbours.nextId) : -1;
  let addedOnTop = 0;
  const { removedAt } = neighbours;
  if (removedAt !== undefined) while (addedOnTop < messages.length && messages[addedOnTop].at > removedAt) addedOnTop += 1;
  const at = prevAt >= 0 ? prevAt + 1 : nextAt >= 0 ? nextAt : Math.max(0, Math.min(index + addedOnTop, messages.length));
  return [...messages.slice(0, at), message, ...messages.slice(at)];
}

/** Largest |timestamp| a JS Date accepts; beyond it toISOString() throws. */
const MAX_TIME = 8.64e15;

/** ISO date for a message's `at`, or null when it is outside the Date range (stored data is untrusted). */
export function addedIso(at: number): string | null {
  return Number.isFinite(at) && Math.abs(at) <= MAX_TIME ? new Date(at).toISOString() : null;
}

export function formatLetter(message: Message): string {
  return `${message.name} <${message.email}>\n${message.subject}\n\n${message.body}`;
}
