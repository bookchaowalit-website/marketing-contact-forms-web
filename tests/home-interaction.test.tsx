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
