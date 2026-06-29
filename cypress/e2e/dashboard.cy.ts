// Portfolio Dashboard — UI tests (Cypress driving the real browser).
//
// These exercise the dashboard at "/", using cy.intercept to observe, stub, and
// assert on the network calls the UI makes — the way we test components /
// integration in real life. Some of these tests fail or are unreliable. Your
// job in Part 1 is to make the suite green AND correct: fix tests where the
// test is wrong, and the app where the app is wrong. Record what you find in
// FINDINGS.md.

describe("Portfolio Dashboard", () => {
  beforeEach(() => {
    // Restore seed data before each test so the UI renders a known state.
    cy.request("POST", "/api/admin/reset");
  });

  it("renders the seeded portfolios on load", () => {
    cy.visit("/");
    cy.get('[data-cy="portfolio"]').should("have.length", 2);
    cy.contains('[data-cy="portfolio-name"]', "Growth Fund A");
  });

  it("shows a gaining position with the gain style, not the loss style", () => {
    // Growth Fund A's AAPL is up: current 150.25 vs cost 120.00 → a GAIN.
    // The UI styles P&L from the API's value; if the sign is wrong, a gain
    // shows red (loss). This asserts the user-visible behavior is correct.
    cy.visit("/");
    cy.get('[data-cy="portfolio"][data-id="1"]')
      .find('[data-cy="position-row"][data-symbol="AAPL"]')
      .find('[data-cy="position-pnl"]')
      .should("have.class", "pnl-gain")
      .and("not.have.class", "pnl-loss");
  });

  it("renders mocked portfolios from a stubbed API (component-style)", () => {
    // We stub GET /api/portfolios so the UI renders fixture data independent of
    // the backend. BUG: the intercept is registered AFTER cy.visit, so the
    // request fired during page load is never stubbed — the UI shows the real
    // seeded data instead of the mock, and this assertion fails. Register the
    // intercept BEFORE visiting.
    cy.visit("/");
    cy.intercept("GET", "/api/portfolios", {
      statusCode: 200,
      body: [
        {
          id: 99,
          name: "Mocked Fund",
          cashBalance: 1000,
          totalValue: 1000,
          totalPnl: 0,
          positions: [],
        },
      ],
    }).as("list");

    cy.contains('[data-cy="portfolio-name"]', "Mocked Fund");
    cy.get('[data-cy="portfolio"]').should("have.length", 1);
  });

  it("creates a portfolio and confirms the saved status", () => {
    // The create POST resolves after a short delay; the UI shows "Saving…" then
    // "Saved". BUG: this reads the status text into a variable inside a .then()
    // (async) but asserts on it synchronously (outside the command chain), so
    // the assertion runs before the value is set — and before the request has
    // even resolved. Fix by waiting on the create request (cy.intercept alias)
    // and asserting inside the Cypress chain — not with a fixed cy.wait sleep.
    cy.visit("/");

    cy.get('[data-cy="name-input"]').type("Tactical Fund C");
    cy.get('[data-cy="cash-input"]').clear().type("15000");
    cy.get('[data-cy="create-submit"]').click();

    let statusText: string | undefined;
    cy.get('[data-cy="status"]').then(($el) => {
      statusText = $el.text();
    });

    // Runs synchronously, before the .then above — statusText is undefined.
    expect(statusText).to.eq("Saved");
  });
});
