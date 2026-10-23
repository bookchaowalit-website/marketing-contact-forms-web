import { describe, expect, it } from "vitest";
import { SEED, addMessage, filterMessages, formatLetter, markRead, parseMessages, pickActive, removeMessage, type Message } from "@/lib/contact-forms";

const read: Message = { ...SEED[0], id: "r1", name: "Ari", state: "Read" };
const inbox = [SEED[0], read];

describe("pickActive", () => {
  it("does not open a message the current filter hides", () => {
    // Regression: the preview used messages.find(selected), so under "New" a selected Read letter stayed open
    // although the list no longer showed it.
    const visible = filterMessages(inbox, "New");
    expect(pickActive(visible, "r1")?.id).toBe("seed");
  });

  it("opens the selected message when visible, and nothing for an empty view", () => {
    expect(pickActive(inbox, "r1")?.id).toBe("r1");
    expect(pickActive([], "r1")).toBeUndefined();
  });
});

describe("parseMessages", () => {
  it("keeps the sample inbox for missing, broken or non-array storage", () => {
    expect(parseMessages(null)).toBeNull();
    expect(parseMessages("{")).toBeNull();
    expect(parseMessages('{"id":1}')).toBeNull();
  });

  it("drops malformed entries", () => {
    expect(parseMessages(JSON.stringify([read, { ...read, state: "Archived" }, 3]))).toEqual([read]);
  });
});

describe("the sample message", () => {
  it("has a fixed date so the server and browser render the same text", () => {
    expect(new Date(SEED[0].at).toISOString()).toBe("2026-10-01T09:00:00.000Z");
  });
});

describe("addMessage / markRead / removeMessage", () => {
  const draft = { name: " Lee ", email: "lee@example.com ", subject: " Hi ", body: " Hello there " };

  it("adds a trimmed New message first", () => {
    const next = addMessage(inbox, draft, "m1", 5);
    expect(next[0]).toEqual({ id: "m1", name: "Lee", email: "lee@example.com", subject: "Hi", body: "Hello there", at: 5, state: "New" });
    expect(next).toHaveLength(3);
  });

  it("refuses a draft with a blank field", () => {
    expect(addMessage(inbox, { ...draft, body: "   " }, "m2", 5)).toBe(inbox);
  });

  it("marks one message read and removes by id", () => {
    expect(markRead(inbox, "seed").map((m) => m.state)).toEqual(["Read", "Read"]);
    expect(removeMessage(inbox, "seed").map((m) => m.id)).toEqual(["r1"]);
  });
});

describe("formatLetter", () => {
  it("formats sender, subject and body for the clipboard", () => {
    expect(formatLetter(read)).toBe("Ari <mina@example.com>\nA question about the work\n\nI found the project shelf and would like to know how you choose the next experiment.");
  });
});
