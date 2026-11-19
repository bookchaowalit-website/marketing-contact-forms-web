"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { AppFoot, AppTop, ListButton, Pill, PlusIcon, type Tone } from "@/components/app-shell";
import { FILTERS, SEED, STORAGE_KEY, addMessage, filterMessages, formatLetter, markRead, parseMessages, removeMessage, type Draft, type Filter, type Message, type MessageState } from "@/lib/contact-forms";
import { useStoredState } from "@/lib/use-stored-state";

const EMPTY: Draft = { name: "", email: "", subject: "", body: "" };
const MAX_BODY = 2000;
const TONE: Record<MessageState, Tone> = { New: "amber", Read: "grey" };
const LIST_NAME: Record<Filter, string> = { All: "All messages", New: "New", Read: "Read" };

type Removed = { message: Message; index: number; viaKeyboard: boolean };

// randomUUID only exists in secure contexts (HTTPS/localhost) and newer browsers.
function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

const formatDate = (at: number) => new Date(at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export default function Home() {
  const [messages, setMessages] = useStoredState(STORAGE_KEY, SEED, parseMessages);
  const [filter, setFilter] = useState<Filter>("All");
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [openId, setOpenId] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [removed, setRemoved] = useState<Removed | null>(null);
  const [toastFocused, setToastFocused] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);
  const newRef = useRef<HTMLButtonElement>(null);
  const undoRef = useRef<HTMLButtonElement>(null);
  const toastRef = useRef<HTMLDivElement>(null);
  const wasComposing = useRef(false);
  const visible = useMemo(() => filterMessages(messages, filter), [messages, filter]);
  const countOf = (state: Filter) => filterMessages(messages, state).length;
  const ready = Boolean(draft.name.trim() && draft.email.trim() && draft.subject.trim() && draft.body.trim());

  // Opening the composer focuses its first field; closing it returns focus to New message.
  useEffect(() => {
    if (composing) nameRef.current?.focus();
    else if (wasComposing.current) newRef.current?.focus();
    wasComposing.current = composing;
  }, [composing]);
  useEffect(() => { if (removed?.viaKeyboard) undoRef.current?.focus(); }, [removed]);
  // The Undo toast closes 6 s after a removal, but never while it holds focus.
  useEffect(() => {
    if (!removed || toastFocused) return;
    const timer = window.setTimeout(() => setRemoved(null), 6000);
    return () => window.clearTimeout(timer);
  }, [removed, toastFocused]);
  // While the toast shows, the page reserves its height so nothing focusable stays hidden under it.
  const toastShown = removed !== null;
  useLayoutEffect(() => {
    const toast = toastRef.current;
    if (!toastShown || !toast) return;
    const rootStyle = document.documentElement.style;
    rootStyle.setProperty("--as-toast-space", `${toast.offsetHeight + 32}px`);
    return () => { rootStyle.removeProperty("--as-toast-space"); };
  }, [toastShown]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = createId();
    const next = addMessage(messages, draft, id, Date.now());
    if (next === messages) return;
    setMessages(next);
    if (filter === "Read") setFilter("All");
    setSaved(draft.subject.trim());
    setAnnouncement(`Saved “${draft.subject.trim()}” to this browser's inbox. No email was sent.`);
    setDraft(EMPTY);
    setComposing(false);
  }

  function toggle(message: Message) {
    const opening = openId !== message.id;
    setOpenId(opening ? message.id : null);
    if (opening && message.state === "New") setMessages((current) => markRead(current, message.id));
  }

  async function copy(message: Message) {
    try {
      await navigator.clipboard.writeText(formatLetter(message));
      setCopiedId(message.id);
      setAnnouncement("Letter copied to the clipboard.");
    } catch {
      setAnnouncement("Copy is blocked in this browser. Select the text to copy it instead.");
    }
  }

  function remove(message: Message, viaKeyboard: boolean) {
    const index = messages.findIndex((item) => item.id === message.id);
    if (index < 0) return;
    setMessages((current) => removeMessage(current, message.id));
    setRemoved({ message, index, viaKeyboard });
    setAnnouncement(`Removed the message from ${message.name}. Undo is available for a few seconds.`);
  }

  function undo() {
    if (!removed) return;
    const { message, index } = removed;
    setMessages((current) => (current.some((item) => item.id === message.id) ? current : [...current.slice(0, index), message, ...current.slice(index)]));
    setAnnouncement(`Restored the message from ${message.name}.`);
    setRemoved(null);
    setToastFocused(false);
  }

  const title = LIST_NAME[filter];

  return (
    <div className="as">
      <a className="as-skip" href="#main">Skip to content</a>
      <AppTop name="Contact desk" tagline="Write a message, review it locally" />

      <div className="as-body">
        <aside className="as-side" aria-label="Inbox lists">
          <h2>Inbox</h2>
          <ul className="as-lists">
            {FILTERS.map((value) => (
              <ListButton key={value} label={LIST_NAME[value]} count={countOf(value)} tone={value === "All" ? undefined : TONE[value]} current={filter === value} onSelect={() => setFilter(value)} />
            ))}
          </ul>
        </aside>

        <main id="main" className="as-main">
          <div className="as-head">
            <div>
              <h1>{title}</h1>
              <p aria-live="polite">{visible.length} {visible.length === 1 ? "message" : "messages"} · saved in this browser only</p>
            </div>
            <div className="as-tools">
              {composing ? null : <button ref={newRef} type="button" className="as-button" onClick={() => { setComposing(true); setSaved(null); }}><PlusIcon />New message</button>}
            </div>
          </div>

          {saved ? (
            <div className="cf-saved">
              <span>Saved “{saved}” to this browser&apos;s inbox. No email was sent.</span>
              <button type="button" className="as-plain" onClick={() => setSaved(null)}>Dismiss</button>
            </div>
          ) : null}

          {composing ? (
            <form className="as-composer" onSubmit={submit} aria-label="New message">
              <div className="cf-pair">
                <label className="as-field">Your name
                  <input ref={nameRef} required autoComplete="name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
                </label>
                <label className="as-field">Your email
                  <input required type="email" autoComplete="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} placeholder="you@domain.com" />
                </label>
              </div>
              <label className="as-field">Subject
                <input required autoComplete="off" value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} placeholder="What is this about?" />
              </label>
              <label className="as-field">Message
                <textarea required rows={6} maxLength={MAX_BODY} aria-describedby="body-hint" value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} placeholder="Say what you need and the best way to reply." />
                <span id="body-hint" className="cf-hint"><span>A clear first line makes the reply easier.</span><span>{draft.body.length} / {MAX_BODY}</span></span>
              </label>
              <div className="as-composer-foot">
                <p className="as-note" style={{ margin: 0 }}>Nothing is emailed. The message goes to the inbox below.</p>
                <div className="as-composer-actions">
                  <button type="button" className="as-plain" onClick={() => { setComposing(false); setDraft(EMPTY); }}>Cancel</button>
                  <button type="submit" className="as-button" disabled={!ready}>Place in inbox</button>
                </div>
              </div>
            </form>
          ) : null}

          {visible.length ? (
            <ul className="as-list" aria-label={title}>
              {visible.map((message) => {
                const open = openId === message.id;
                return (
                  <li className="as-row" key={message.id}>
                    <div>
                      <h3>
                        <button type="button" className="cf-open" data-new={message.state === "New" ? "true" : undefined} aria-expanded={open} aria-controls={`letter-${message.id}`} onClick={() => toggle(message)}>
                          {`${message.name} · ${message.subject}`}
                        </button>
                      </h3>
                      {open ? null : <p className="as-row-detail">{message.body}</p>}
                      <p className="as-row-meta"><time dateTime={new Date(message.at).toISOString()}>{formatDate(message.at)}</time>{message.id === "seed" ? " · Example message" : ""}</p>
                      {open ? (
                        <div className="cf-letter" id={`letter-${message.id}`}>
                          <p className="cf-from">From {message.name} &lt;{message.email}&gt;</p>
                          <p className="cf-body">{message.body}</p>
                          <div className="cf-letter-actions">
                            <button type="button" className="as-plain" style={{ paddingLeft: 0 }} onClick={() => copy(message)}>Copy letter</button>
                            {copiedId === message.id ? <span>Copied</span> : null}
                          </div>
                        </div>
                      ) : null}
                    </div>
                    <Pill tone={TONE[message.state]}>{message.state}</Pill>
                    <button type="button" className="as-plain as-danger" aria-label={`Remove message from ${message.name}`} onClick={(event) => remove(message, event.detail === 0)}>Remove</button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="as-list as-empty">
              {messages.length === 0 ? (
                <><strong>The inbox is empty</strong>Press New message to write the first one.</>
              ) : filter === "New" ? (
                <><strong>No new messages</strong>Everything here has been read. Messages you add start as New.</>
              ) : (
                <><strong>Nothing read yet</strong>Open a message in All messages to mark it as read.</>
              )}
            </div>
          )}

          <p className="as-note">This is a browser-only prototype of a contact intake desk. No email is sent, nothing is synced to a CRM, and senders are not verified. The example message shows how a submission looks.</p>
        </main>
      </div>

      <p className="as-sr" role="status" aria-live="polite">{announcement}</p>
      {removed ? (
        <div
          ref={toastRef}
          className="as-toast"
          role="group"
          aria-label="Undo remove"
          onFocus={() => setToastFocused(true)}
          onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setToastFocused(false); }}
          onKeyDown={(event) => { if (event.key === "Escape") { setRemoved(null); setToastFocused(false); } }}
        >
          <span>Removed message from {removed.message.name}</span>
          <button ref={undoRef} type="button" className="as-plain" onClick={undo}>Undo</button>
        </div>
      ) : null}

      <AppFoot source="https://github.com/bookchaowalit-website/marketing-contact-forms-web" />
    </div>
  );
}
