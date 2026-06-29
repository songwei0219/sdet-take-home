# SDET Take-Home — Quality Infrastructure

Welcome, and thanks for your time. This exercise mirrors the day-to-day of our
Quality Infrastructure team: you'll **stabilize an existing test suite** and
**extend the framework**, rather than build something from scratch.

**Target time: ~90 minutes, in two parts.** We care about quality of thinking,
not completion for its own sake. If you finish early, great; if you run over,
just tell us where the time went. Please **log your actual time** in
`SUBMISSION.md`.

> You are encouraged to use AI-assisted tools (Copilot, Claude, etc.) — we use
> them on the job. We just ask you to be honest about how, in `AI_USAGE.md`.
> See "What to submit" below.

---

## The system under test

A small **Portfolio Dashboard** web app (an Eze Eclipse-style service) lives in
`app/`. The browser UI (`app/public/`) lists portfolios, shows each position's
P&L, and lets you create a portfolio; it's backed by a tiny JSON API
(`app/server.js`, Node's built-in `http`, no DB). Everything is served from
`http://localhost:3001`.

The existing **Cypress** suite (`cypress/e2e/`) drives the **real UI in the
browser** and uses `cy.intercept` to observe and stub network calls — the way we
write component / integration tests in practice.

Backing endpoints (you mostly interact with them through the UI):

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/portfolios` | List all portfolios (the UI fetches this on load) |
| POST | `/api/portfolios` | Create a portfolio `{ name, cashBalance }` |
| POST | `/api/portfolios/:id/trades` | Execute a trade |
| POST | `/api/admin/reset` | Restore seed data (test-isolation hook) |

## Setup

Requires **Node 22 or 24** (current LTS lines).

```bash
npm install
npx cypress install   # downloads the Cypress binary into your local cache

# Run the app and the suite together (recommended):
npm test

# Or, in two terminals:
npm run api          # terminal 1 — serves the app on :3001
npm run cy:open      # terminal 2 — interactive Cypress runner (watch it drive the UI)
```

When you first run the suite, **several tests fail or behave unreliably**. That
is intentional — see Part 1.

---

## Part 1 — Stabilize (~45 min)

The suite has **three** distinct problems. Some are bugs in the *tests*; at least
one is a bug in the *application*. Your job:

1. **Make the suite pass reliably**, run after run, in any order.
2. For each issue, decide whether the fix belongs in the **test** or the **app**,
   and fix it in the right place. (You may edit `app/server.js` — if you do, say
   why.)
3. **Document each issue in `FINDINGS.md`**: symptom, root cause, where you fixed
   it, and how you verified the fix.

Constraints:
- Do **not** "fix" a failing test by weakening it to assert nothing meaningful,
  or by deleting it.
- Do **not** stabilize a timing-sensitive test with a fixed `cy.wait(<ms>)`
  sleep — handle the asynchrony properly (wait on the network, retry assertions).

We are evaluating how you **diagnose** problems, not just whether the bar turns
green.

## Part 2 — Extend (~45 min)

### 2a. Framework helper (write real code)

Add **one** reusable helper to the framework and use it in at least one test.
Pick whichever you'd reach for first on a real team:

- **Option A — Fixture/stub helper:** a typed helper that stubs the portfolios
  endpoint (`cy.intercept`) with given fixture data and aliases it, so
  component-style tests can render arbitrary states without the backend. Show it
  in use.
- **Option B — Custom command:** a `cy.seedPortfolio(...)` (or similar) command
  that sets up state via the API and returns what the test needs, removing setup
  boilerplate. Show it in use.

Put the helper somewhere sensible (e.g. `cypress/support/`) and keep it typed.

### 2b. CI & alerting (written design — no code required)

In `DESIGN.md`, describe how you would:

1. Run this suite in **GitHub Actions** on every pull request — sketch the
   workflow (jobs, steps, how the API is started, how failures fail the build).
   A YAML snippet is welcome but prose is fine.
2. On a failed run, post a **failure summary to Slack** (or emit a structured
   JSON summary an alerting system could consume). What goes in the message, and
   how would you keep it useful rather than noisy?

We're looking for your reasoning about feedback loops and signal quality, not a
working pipeline.

---

## What to submit

Commit everything to a Git repo (see `submission_guidelines.md`) including:

- Your fixed code (`cypress/`, and `app/server.js` if you changed it)
- **`FINDINGS.md`** — the three Part 1 issues (template provided)
- **`DESIGN.md`** — your Part 2b answer (template provided)
- **`SUBMISSION.md`** — time log + brief notes (template provided)
- **`AI_USAGE.md`** — how you used AI tools, if at all (template provided)

The four `.md` templates are in the repo root — fill them in.
