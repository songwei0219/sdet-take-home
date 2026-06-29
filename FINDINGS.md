# Part 1 — Findings

Document each issue you found and fixed. Add or remove sections as needed
(there are three issues to find).

## Issue 1

- **Symptom:** A position that is a numeric gain was rendered with the loss styling; the test "shows a gaining position..." failed with an assertion on CSS class (expected pnl-gain, got pnl-loss).
- **Root cause:** App bug: positionPnl computed (costBasis - currentPrice) * quantity, producing the opposite sign for P&L.
- **Fix location:** app/server.js — corrected positionPnl to return (currentPrice - costBasis) * quantity.
- **How I verified:** Ran the Cypress suite (npm test) and inspected the UI in headed mode; numeric P&L was positive and the element had class pnl-gain. The related test now passes consistently.

## Issue 2

- **Symptom:** Test that stubs GET /api/portfolios intermittently failed — the UI displayed seeded data instead of the mocked fixture (assertion for "Mocked Fund" timed out).
- **Root cause:** Test bug: cy.intercept was registered after cy.visit, so the initial page-load request was not stubbed.
- **Fix location:** cypress/e2e/dashboard.cy.ts — moved the cy.intercept('GET','/api/portfolios', ...) before cy.visit('/') and added cy.wait('@list').

- **How I verified:** Ran the test locally; the intercept returned the mocked body on initial load, the UI showed "Mocked Fund", and the test passed reliably across runs.

## Issue 3

- **Symptom:** The "creates a portfolio and confirms the saved status" test intermittently failed with expected undefined to equal 'Saved'.
- **Root cause:** Test bug: code read status text into a local variable inside a .then(...) but asserted on that variable synchronously, causing a race (did not wait for network/DOM update).
- **Fix location:** cypress/e2e/dashboard.cy.ts — added cy.intercept('POST','/api/portfolios').as('create'), waited with cy.wait('@create'), and asserted cy.get('[data-cy="status"]').should('contain','Saved') inside the Cypress chain.
- **How I verified:** Ran the suite (npm test) headless and in GUI; POST returned a 201 and the UI updated to "Saved", and the test passed reliably.

## Anything else you noticed

The app/server.js is small and easy to reason about; the P&L bug was straightforward to fix and required an app change because it produced incorrect user-visible behavior.

Tests were stabilized by using intercept+alias and waiting on network calls rather than arbitrary sleeps; these patterns make tests robust and clearer about intent.

With more time I would add typed custom commands (e.g., cy.seedPortfolio) and a fixture helper to reduce boilerplate and make component-style tests easier to author.