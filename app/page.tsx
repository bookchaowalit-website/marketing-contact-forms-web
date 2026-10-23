"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { FILTERS, SEED, STORAGE_KEY, addMessage, filterMessages, formatLetter, markRead, parseMessages, pickActive, removeMessage, type Filter } from "@/lib/contact-forms";
import { useStoredState } from "@/lib/use-stored-state";

export default function Home() {
  const [messages, setMessages] = useStoredState(STORAGE_KEY, SEED, parseMessages);
  const [selected, setSelected] = useState("seed");
  const [filter, setFilter] = useState<Filter>("All");
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", subject: "", body: "" });
  const visible = useMemo(() => filterMessages(messages, filter), [filter, messages]);
  const active = pickActive(visible, selected);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const id = crypto.randomUUID();
    const next = addMessage(messages, form, id, Date.now());
    if (next === messages) return;
    setMessages(next);
    setSelected(id);
    setForm({ name: "", email: "", subject: "", body: "" });
    setSent(true);
    window.setTimeout(() => setSent(false), 2200);
  };

  const copyActive = async () => { if (!active) return; try { await navigator.clipboard.writeText(formatLetter(active)); } catch { /* Clipboard is optional. */ } };

  return (
    <main className="correspondence-page">
      <span className="contract-mark" dangerouslySetInnerHTML={{ __html: "<!-- THESIS: contact is a correspondence intake, not a fake email SaaS; FINISH: compose, local inbox, read state, honest delivery boundary -->" }} />
      <div className="correspondence-shell">
        <header className="correspondence-topbar"><Link href="/" className="correspondence-mark">INBOX / INTAKE</Link><span>correspondence room · browser only</span></header>
        <section className="correspondence-hero"><div><p className="correspondence-kicker">leave a useful first line</p><h1>Make the first reply easier.</h1></div><p className="correspondence-deck">A small contact desk that lets you compose a message and inspect what a local submission would look like before any delivery system is attached.</p></section>

        <section className="correspondence-layout" aria-labelledby="compose-heading">
          <div className="compose-paper"><header className="correspondence-heading"><div><span>01</span><h2 id="compose-heading">Write the note</h2></div><em>{sent ? "saved locally" : "new correspondence"}</em></header><form onSubmit={submit}><div className="input-pair"><label><span>Your name</span><input required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></label><label><span>Your email</span><input required type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></label></div><label><span>Subject</span><input required value={form.subject} onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))} /></label><label><span>Message</span><textarea required rows={8} value={form.body} onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))} /></label><button className="send-button" type="submit">Place in local inbox</button></form><p className="compose-note">No email is sent. This is a browser-only prototype of the intake and review loop.</p></div>

          <div className="inbox-column"><header className="correspondence-heading"><div><span>02</span><h2>Local inbox</h2></div><strong>{visible.length} {visible.length === 1 ? "message" : "messages"}</strong></header><div className="inbox-tools"><div className="inbox-tabs" role="group" aria-label="Filter messages">{FILTERS.map((state) => <button type="button" className={filter === state ? "active" : ""} key={state} onClick={() => setFilter(state)}>{state}</button>)}</div><span>select a line to read</span></div><div className="message-list">{visible.map((message) => <button type="button" className={`message-row ${active?.id === message.id ? "selected" : ""}`} key={message.id} onClick={() => { setSelected(message.id); setMessages((current) => markRead(current, message.id)); }}><span className={`message-dot state-${message.state.toLowerCase()}`} aria-hidden="true" /><span><strong>{message.name}</strong><small>{message.subject}</small></span><time>{new Date(message.at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</time></button>)}{visible.length === 0 && <p className="empty-inbox">The inbox is quiet on this filter.</p>}</div><article className="message-preview" aria-label="Selected message"><header><span>03 / open letter</span><button type="button" onClick={copyActive} disabled={!active}>Copy</button></header>{active ? <><p className="preview-from">{active.name} <small>&lt;{active.email}&gt;</small></p><h3>{active.subject}</h3><p className="preview-body">{active.body}</p><button type="button" className="remove-message" onClick={() => { setMessages((current) => removeMessage(current, active.id)); setSelected(""); }}>Remove message</button></> : <p className="empty-inbox">Select a message to open the letter.</p>}</article></div>
        </section>
        <footer className="correspondence-footer">Local correspondence prototype · no outbound email, CRM sync, or sender identity verification is implied.</footer>
      </div>
    </main>
  );
}
