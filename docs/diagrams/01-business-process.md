# 01 — Business process (As-Is / To-Be)

marketing-contact-forms-web คือต้นแบบฟอร์มติดต่อและกล่องจดหมายในหน้าเดียว (contact-forms.bookchaowalit.com) เขียน แล้วอ่านใน browser เดียวกัน เก็บใน localStorage ไม่ส่งอีเมลและไม่มีฐานข้อมูล พร้อม `/api/mcp` แบบ stateless ที่เห็นเฉพาะจดหมายตัวอย่าง

Last reviewed: 2026-11-28 · commit `5a8869a`

## As-Is (จากโค้ดวันนี้)

```mermaid
flowchart TD
  PUSH["push or PR to main"] --> CI["GitHub Actions: shared ci-node + shared security scan"]
  MAIN["push to main"] -.->|"PRODUCT.md 2026-10-23: Vercel Git link names the old repository, deploy by CLI; current state [ต้องยืนยัน]"| PROD["production may lag main"]
  VISIT["visitor request (code on main at 5a8869a)"] --> PAGE["GET / : useStoredState loads contact-forms-v2 from localStorage"]
  PAGE -->|"no data, unreadable, JSON parse fails or not an array"| SEED["show the sample letter (example.com address)"]
  PAGE -->|"array with some malformed items"| DROP["drop only the malformed items, no sample letter; all malformed gives an empty inbox"]
  PAGE --> FILTER["filter All, New or Read"]
  FILTER --> OPEN["open a letter: markRead if New, kept visible until closed"]
  OPEN --> COPY["Copy: clipboard.writeText of formatLetter"]
  COPY -->|"clipboard blocked"| MSG["announce: copy is blocked, select the text instead"]
  FILTER --> REMOVE["Remove (on every row, open or closed, New or Read): removeMessage, Undo toast 6 s; removing again joins the batch and restarts 6 s; one Undo restoreMessage puts the whole batch back near its neighbours"]
  PAGE --> COMPOSE["New message form: name, email, subject, body (max 2000)"]
  COMPOSE --> EMAILCHK{"browser input type=email accepts the address?"}
  EMAILCHK -->|"no: browser blocks submit"| NOSUBMIT["addMessage never runs"]
  EMAILCHK -->|yes| VALID{"all four fields non-blank after trim?"}
  VALID -->|no| NOOP["addMessage returns the list unchanged, nothing saved"]
  VALID -->|yes| ADD["addMessage prepends a New letter, announce: no email was sent"]
  ADD -->|"localStorage write ok"| KEPT["letter survives reload"]
  ADD -->|"write blocked or storage full"| MEMONLY["letter lives in page memory only, confirmation still shows, gone after reload"]
  ADD --> FILTER
  MCP["POST /api/mcp JSON-RPC"] --> TOOLS["list_messages (All, New, Read) and get_message over SEED only"]
  TOOLS -->|"bad method, state or id"| ERR["HTTP 400 with JSON-RPC error code"]
  PAGE -.->|"runtime error, only if NEXT_PUBLIC_SENTRY_DSN set"| SENTRY["Sentry, errors only, scrubEvent strips request, user, query strings"]
```

Sources: `app/page.tsx`, `lib/contact-forms.ts`, `lib/use-stored-state.ts`, `app/api/mcp/route.ts`, `lib/sentry.ts`, `next.config.ts`, `PRODUCT.md`

ข้อเท็จจริงจากโค้ด: ไม่มี outbound email, CRM sync หรือการตรวจผู้ส่ง; `/api/mcp` ไม่มี auth/rate limit ในโค้ด (เปิดสาธารณะ ส่งกลับเฉพาะจดหมายตัวอย่าง). robots และ sitemap เป็นไฟล์สแตติก `public/robots.txt` และ `public/sitemap.xml` (robots ชี้ sitemap ของโดเมนนี้) ไม่ใช่ `app/robots.ts`/`app/sitemap.ts`. PRODUCT.md อ้าง Vercel Analytics แต่ไม่พบในโค้ด [ต้องยืนยัน]. [ต้องยืนยัน] สถานะ deploy ปัจจุบัน (PRODUCT.md บันทึกเมื่อ 2026-10-23).

## To-Be (PRODUCT.md §Live URL and deploy state)

```mermaid
flowchart TD
  PUSH["push to main"] --> CI["GitHub Actions: shared ci-node + shared security scan"]
  PUSH --> VERCEL["Vercel Git deploy to contact-forms.bookchaowalit.com, Git link points to this repository"]
  VERCEL --> PAGE["GET / and POST /api/mcp (same as As-Is)"]
```

Sources: `PRODUCT.md` (owner action D9: reconnect Vercel Git to this repository)

## Gap

| ID | As-Is → To-Be | Status | Owner | Evidence |
|---|---|---|---|---|
| G1 | (ตรวจ Git link ปัจจุบันของ Vercel project ก่อน; PRODUCT.md 2026-10-23 ว่า) Vercel Git link ชี้ repo เก่า, deploy ด้วย CLI → เชื่อมกับ repo นี้ให้ push to `main` deploy เอง | decide | owner | `PRODUCT.md` §Live URL and deploy state (owner action D9) |
| G2 | PRODUCT.md อ้าง Vercel Analytics แต่ไม่พบในโค้ด → ตรวจแล้วแก้เอกสารหรือยืนยันที่ Vercel | todo | claude | `package.json`, `app/layout.tsx` (ไม่มี import) |

## Open questions

- production มี Sentry และ MCP route ปัจจุบันหรือยัง
