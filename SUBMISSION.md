# Submission Notes

**Candidate:** Wei Song
**Date:** Jun 28th, 2026

## Time log

| Part | Time spent |
|---|---|
| Part 1 — Stabilize | 40 min |
| Part 2a — Helper | 10 min |
| Part 2b — Design write-up | 35 min |
| **Total** | 85 min |

(If you went over 90 minutes, that's fine — just tell us where the time went.)

## Part 2a — which helper did you build, and why?

I did not add new helper code due to time. I prioritized stabilizing the failing suite and fixing an app bug so tests are reliable. With more time I would implement Option B: a typed custom command cy.seedPortfolio(...) to seed state via the API and return created objects.

## How to run your submission

No change to the normal workflow — these commands reproduce my run:

1.Node 22 or 24 (I used v24.18.0)
2.git clone https://github.com/songwei0219/sdet-take-home.git
3.cd sdet-take-home
4.npm install
5.npx cypress install
6.npm test # starts the API and runs Cypress headless

## Notes for the reviewer

Changes of note:
app/server.js: fixed positionPnl sign bug (currentPrice - costBasis) so P&L sign matches user expectation.
cypress/e2e/dashboard.cy.ts: stabilized tests by registering intercepts before cy.visit, waiting on network aliases, and asserting asynchronously within the Cypress command chain.

Rationale & trade-offs:
I fixed the app bug because it produced incorrect user-visible behavior that tests should verify.
Tests were fixed to wait on network and assert DOM state rather than using arbitrary sleeps.

Next improvements (if more time):
Add a typed custom command (cy.seedPortfolio) and/or a fixture/stub helper for component-style tests.
Add Cypress custom commands typing in support/index and add CI caching and JUnit reporting in Actions.