// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "@/app/page";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let host: HTMLDivElement;
const $ = <T extends Element = HTMLElement>(selector: string) => host.querySelector(selector) as T | null;
const button = (text: string, scope: ParentNode = host) => [...scope.querySelectorAll("button")].find((b) => b.textContent?.trim().startsWith(text)) as HTMLButtonElement;
const rows = () => [...host.querySelectorAll(".as-row .cf-open")].map((b) => b.textContent);
const press = (el: Element, detail = 1) => act(() => { el.dispatchEvent(new MouseEvent("click", { bubbles: true, detail })); });
function type(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  act(() => {
    Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
function compose() {
  if (!$(".as-composer")) press(button("New message"));
  const inputs = host.querySelectorAll<HTMLInputElement>(".as-composer input");
  type(inputs[0], "Ada");
  type(inputs[1], "ada@domain.test");
  type(inputs[2], "Project idea");
  type($<HTMLTextAreaElement>(".as-composer textarea")!, "Can we talk next week?");
}

beforeEach(() => {
  localStorage.clear();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root.render(<Home />));
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.useRealTimers();
});

describe("composer", () => {
  it("opens focused, keeps Place disabled until every field has text, saves on top with a lasting confirmation", () => {
    press(button("New message"));
    expect(document.activeElement).toBe($(".as-composer input"));
    expect(button("Place in inbox").disabled).toBe(true);
    compose();
    expect(host.textContent).toContain("22 / 2000");
    expect(button("Place in inbox").disabled).toBe(false);
    act(() => { $<HTMLFormElement>(".as-composer")!.requestSubmit(); });
    expect(rows()[0]).toBe("Ada · Project idea");
    expect($(".cf-saved")!.textContent).toContain("No email was sent");
    expect($('[role="status"]')!.textContent).toContain("Saved “Project idea”");
    expect(document.activeElement?.textContent).toContain("New message");
    expect(JSON.parse(localStorage.getItem("contact-forms-v2")!)[0]).toMatchObject({ name: "Ada", state: "New" });
    press(button("Dismiss"));
    expect($(".cf-saved")).toBeNull();
  });

  it("Cancel closes the composer and clears the draft", () => {
    compose();
    press(button("Cancel"));
    expect($(".as-composer")).toBeNull();
    press(button("New message"));
    expect($<HTMLInputElement>(".as-composer input")!.value).toBe("");
  });
});

describe("lists, reading and removing", () => {
  it("opening a message marks it read and shows the letter; filters have their own empty states", () => {
    press(button("Mina Park"));
    expect($(".cf-letter")!.textContent).toContain("mina@example.com");
    expect(host.querySelector(".as-pill")!.textContent).toBe("Read");
    press(button("New", $(".as-side")!));
    expect($(".as-empty")!.textContent).toContain("No new messages");
    press(button("Read", $(".as-side")!));
    expect(rows()).toHaveLength(1);
    press(button("Mina Park"));
    expect($(".cf-letter")).toBeNull();
  });

  it("copies the letter and reports a blocked clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    press(button("Mina Park"));
    await act(async () => { button("Copy letter").click(); });
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("Mina Park <mina@example.com>"));
    expect(host.textContent).toContain("Copied");
    writeText.mockRejectedValueOnce(new Error("blocked"));
    await act(async () => { button("Copy letter").click(); });
    expect($('[role="status"]')!.textContent).toContain("Copy is blocked");
  });

  it("Remove offers Undo, which puts the message back; the toast closes on its own", () => {
    vi.useFakeTimers();
    press(button("Remove"), 0);
    expect($(".as-empty")!.textContent).toContain("The inbox is empty");
    expect(document.activeElement?.textContent).toBe("Undo");
    press(button("Undo"));
    expect(rows()).toEqual(["Mina Park · A question about the work"]);
    press(button("Remove"));
    expect($(".as-toast")).not.toBeNull();
    act(() => { vi.advanceTimersByTime(6100); });
    expect($(".as-toast")).toBeNull();
  });

  it("Escape closes the toast", () => {
    press(button("Remove"), 0);
    act(() => { $(".as-toast")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); });
    expect($(".as-toast")).toBeNull();
  });
});

describe("batch Undo", () => {
  // Two more messages, so there are at least three rows to remove from.
  beforeEach(() => {
    for (let n = 0; n < 2; n++) {
      compose();
      act(() => { $<HTMLFormElement>(".as-composer")!.requestSubmit(); });
    }
  });
  // detail 0 = keyboard (Enter/Space) click, 1 = pointer click.
  const click = (el: Element, detail: number) => act(() => { el.dispatchEvent(new MouseEvent("click", { bubbles: true, detail })); });
  const shownRows = () => [...host.querySelectorAll<HTMLElement>(".as-row[data-item]")];
  const rowIds = () => shownRows().map((row) => row.dataset.item);
  const removeButton = (i: number) => shownRows()[i].querySelector<HTMLButtonElement>(".as-danger")!;
  const undoButton = () => host.querySelector<HTMLButtonElement>(".as-toast button")!;
  const escape = () => act(() => { $(".as-toast")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); });

  it("consecutive removes restore together with one Undo", () => {
    vi.useFakeTimers();
    const before = rowIds();
    expect(before.length).toBeGreaterThanOrEqual(3);
    click(removeButton(1), 1);
    act(() => { vi.advanceTimersByTime(4000); });
    click(removeButton(0), 1);
    expect(rowIds()).toEqual(before.slice(2));
    expect($(".as-toast span")!.textContent).toBe("Removed 2 messages");
    expect(undoButton().getAttribute("aria-label")).toBe("Undo remove of 2 messages");
    // The second removal restarted the 6 s window: 4 s later it is still open.
    act(() => { vi.advanceTimersByTime(4000); });
    click(undoButton(), 1);
    expect(rowIds()).toEqual(before);
    expect($(".as-toast")).toBeNull();
    expect($(".as-sr[role=status]")!.textContent).toBe("Restored 2 messages.");
  });

  it("keyboard remove focuses Undo; Undo focuses the restored row, Escape the next one", () => {
    const before = rowIds();
    click(removeButton(0), 0);
    expect(document.activeElement).toBe(undoButton());
    expect(document.documentElement.style.getPropertyValue("--as-toast-space")).toMatch(/px$/);
    click(undoButton(), 0);
    expect(rowIds()).toEqual(before);
    expect(document.activeElement).toBe(removeButton(0));
    click(removeButton(0), 0);
    escape();
    expect($(".as-toast")).toBeNull();
    expect(document.activeElement).toBe(removeButton(0));
    expect(rowIds()).toEqual(before.slice(1));
  });
});

describe("2026-11-20 review", () => {
  it("a message opened from the New list stays open to read; closing it hands focus on", () => {
    press(button("New", $(".as-side")!));
    press(button("Mina Park"));
    expect($(".cf-letter")!.textContent).toContain("mina@example.com");
    expect(rows()).toEqual(["Mina Park · A question about the work"]);
    expect(JSON.parse(localStorage.getItem("contact-forms-v2")!)[0].state).toBe("Read");
    act(() => { button("Mina Park").focus(); });
    press(button("Mina Park"), 0);
    expect(rows()).toEqual([]);
    expect(document.activeElement).toBe(host.querySelector('.as-lists button[aria-current="true"]'));
  });

  it("after Undo, messages saved since the removal stay on top", () => {
    compose();
    act(() => { $<HTMLFormElement>(".as-composer")!.requestSubmit(); });
    const ids = () => [...host.querySelectorAll<HTMLElement>(".as-row[data-item]")].map((row) => row.dataset.item);
    const [first, seed] = ids();
    press(host.querySelector<HTMLButtonElement>(`.as-row[data-item="${first}"] .as-danger`)!);
    compose();
    act(() => { $<HTMLFormElement>(".as-composer")!.requestSubmit(); });
    const added = ids()[0];
    expect(added).not.toBe(first);
    press(button("Undo"));
    expect(ids()).toEqual([added, first, seed]);
  });

  it("a long unbroken subject wraps in the save confirmation", async () => {
    const { readFileSync } = await import("node:fs");
    const css = readFileSync(`${process.cwd()}/app/globals.css`, "utf8");
    expect(css).toMatch(/\.cf-saved > span \{[^}]*min-width: 0;[^}]*overflow-wrap: anywhere;/);
  });
});

describe("out-of-range dates", () => {
  it("a saved message whose date is outside the Date range renders with \"Date unknown\" instead of crashing", () => {
    act(() => root.unmount());
    localStorage.setItem("contact-forms-v2", JSON.stringify([{ id: "x", name: "Bo", email: "bo@domain.test", subject: "Odd date", body: "Hi", at: 1e300, state: "New" }]));
    root = createRoot(host);
    act(() => root.render(<Home />));
    expect(rows()).toEqual(["Bo · Odd date"]);
    const meta = host.querySelector(".as-row .as-row-meta")!;
    expect(meta.textContent).toContain("Date unknown");
    expect(meta.querySelector("time")).toBeNull();
  });
});
