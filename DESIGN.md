# Contact desk — Design direction

## Product surface

Contact desk is a local contact intake prototype. A visitor composes a message; an operator reads, marks as read, copies or removes it in a browser-only inbox.

## System (2026-11-19)

The site uses the shared **App shell** (`app/app-shell.css`, `components/app-shell.tsx`, see `APP-SHELL.md`), copied byte-identical from productivity-ideas-web. All colours are the shell's `--as-*` tokens (light and dark); the few contact-desk additions in `app/globals.css` (`.cf-*`) reuse those tokens and add no literal colours. Typography is Geist via `next/font`.

- Lists: All messages, New, Read, each with a count.
- One filled button: New message. The composer opens in place, focuses Your name, shows a character count for the message, and keeps Place in inbox disabled until every field has text.
- After saving, a green confirmation stays until dismissed, and a polite live region announces it.
- Rows: sender and subject (opens the letter and marks it read), one line of the message, date, a New/Read pill (text, not colour alone), and Remove with Undo.
- Floor: text >= 12px, controls >= 44px, 3px focus ring, 4.5:1 text, 3:1 input edges, no horizontal scroll at 320px.

## Honesty constraints

Submission is explicitly local. No outbound email, CRM sync or sender verification is represented. The seeded message is labelled as an example.
