# Contact Forms

A browser-only contact intake demo: write a note (name, email, subject, message), place it in a local inbox, filter
the inbox by New or Read, open a letter (which marks it Read), copy it as text or remove it. The inbox starts with one
sample letter and is kept in this browser's localStorage.

Live: https://contact-forms.bookchaowalit.com (deployed by Vercel CLI; it can lag `main`, see `PRODUCT.md`).

## What it does not do

- No email is sent and nothing reaches a server: no embeddable form, no notifications, no spam protection, no CRM.
- No sender verification, account or sync between browsers.

## Run

```bash
npm ci
npm run dev
```

## Checks

```bash
npm test           # Vitest: inbox logic, MCP route, home page render, Sentry scrubbing
npm run lint
npm run typecheck
npm run build
```

CI (`.github/workflows/ci.yml`) runs the shared Node workflow (with a line-coverage gate) and the shared security
scan on every push and PR to `main`.

## Code map

- `lib/contact-forms.ts`: sample letter, `parseMessages` (validates stored data), `filterMessages`, `pickActive`,
  `addMessage`, `markRead`, `removeMessage`, `formatLetter` (used by the page and the MCP route).
- `lib/use-stored-state.ts`: localStorage-backed state via `useSyncExternalStore` (server render uses the sample).
- `app/api/mcp/route.ts`: stateless JSON-RPC endpoint with `list_messages` and `get_message` over the sample inbox.
- `lib/sentry.ts` + `instrumentation*.ts`: error reporting to Sentry, errors only, personal data stripped; off when
  `NEXT_PUBLIC_SENTRY_DSN` is unset.
- `app/more-projects/page.tsx`: shared portfolio link page (copied per repository, not a package).
