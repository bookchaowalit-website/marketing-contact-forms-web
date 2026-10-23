# Contact Forms — Product truth

> Inferred from the code and copy (no user interview). Checked against the portfolio card claims review
> (`portfolio-site-web/docs/audits/CARD-CLAIMS-REVIEW-2026-10.md`, row `contact-forms`, evidence Prototype) on
> 2026-10-23.

## What it is

A client-only prototype of a contact form and the inbox that would receive it, both in one page and one browser.

## Who it is for

A portfolio visitor who wants to see the compose → inbox → read loop of a contact desk without any delivery system.

## What works today

1. Compose a note; all four fields are required (blank-only input is refused) and the note lands first in the inbox.
2. Filter the inbox by All, New or Read; opening a letter marks it Read. If the filter hides the selected letter, the
   first visible one opens instead.
3. Copy the open letter as plain text or remove it. The inbox is saved in localStorage and survives a reload; broken
   stored data is ignored and the sample letter is shown.
4. `/api/mcp` answers JSON-RPC with `list_messages` and `get_message` over the sample letter (it cannot see notes
   placed in a browser, and it sends nothing).
5. Front-end and server errors go to Sentry (errors only, personal data stripped) when `NEXT_PUBLIC_SENTRY_DSN` is set.

## What does not work (and must not be claimed)

- No self-hosted form system, embeddable snippet, honeypot or spam protection, email notifications or adoption
  across other projects (claims removed from the portfolio card in the 2026-10 review).
- No outbound email, CRM sync or sender verification. No product analytics beyond Vercel Analytics.

## Live URL and deploy state

- Live: https://contact-forms.bookchaowalit.com (HTTP 200 on 2026-10-23).
- The Vercel project `bookchaowalit-contact-forms-frontend` is deployed only by CLI (last production 2026-10-23, CLI
  deploy of commit ae8f5c5, the Next 16.4.2 security patch) and its Git link names the old repository
  `bookchaowalit/bookchaowalit-contact-forms-frontend`, so a push to `main` does not deploy. The live site lags
  `main` (no Sentry, template MCP route) until the owner reconnects Vercel Git to this repository (owner action D9).
  `NEXT_PUBLIC_SENTRY_DSN` is already set on the Vercel project (Sentry project `marketing-contact-forms-web`, org
  `personal-yu0`).

## Boundaries

- Browser-only apart from the stateless `/api/mcp` route. The sample letter uses an example.com address.
