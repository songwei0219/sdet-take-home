// Portfolio Dashboard — minimal vanilla JS front end.
// Fetches portfolios on load, renders each with positions + P&L, and supports
// creating a new portfolio (which the backend answers after a short delay).

const fmt = (n) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

function renderPortfolios(portfolios) {
  const root = document.querySelector("#portfolios");
  if (!portfolios.length) {
    root.innerHTML = "<p>No portfolios yet.</p>";
    return;
  }
  root.innerHTML = portfolios
    .map((pf) => {
      const rows = pf.positions
        .map((p) => {
          // P&L styling is driven by the value the API returns. If the API's
          // P&L sign is wrong, a real gain renders with the "loss" class.
          const cls = p.pnl >= 0 ? "pnl-gain" : "pnl-loss";
          return `
            <tr data-cy="position-row" data-symbol="${p.symbol}">
              <td>${p.symbol}</td>
              <td>${p.quantity}</td>
              <td>${fmt(p.currentPrice)}</td>
              <td class="${cls}" data-cy="position-pnl">${fmt(p.pnl)}</td>
            </tr>`;
        })
        .join("");
      return `
        <div class="portfolio" data-cy="portfolio" data-id="${pf.id}">
          <h2 data-cy="portfolio-name">${pf.name}</h2>
          <div>Cash: <span data-cy="cash">${fmt(pf.cashBalance)}</span></div>
          <div class="total">
            Total value: <span data-cy="total-value">${fmt(pf.totalValue)}</span>
            &nbsp;|&nbsp; Total P&amp;L:
            <span class="${pf.totalPnl >= 0 ? "pnl-gain" : "pnl-loss"}" data-cy="total-pnl">
              ${fmt(pf.totalPnl)}
            </span>
          </div>
          <table>
            <thead>
              <tr><th>Symbol</th><th>Qty</th><th>Price</th><th>P&amp;L</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`;
    })
    .join("");
}

function loadPortfolios() {
  return fetch("/api/portfolios")
    .then((r) => r.json())
    .then(renderPortfolios)
    .catch(() => {
      document.querySelector("#portfolios").innerHTML =
        "<p>Failed to load portfolios.</p>";
    });
}

function setupForm() {
  const form = document.querySelector("#create-form");
  const status = document.querySelector("#status");
  const submit = document.querySelector('[data-cy="create-submit"]');

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = form.name.value.trim();
    const cashBalance = Number(form.cashBalance.value) || 0;
    if (!name) return;

    submit.disabled = true;
    status.textContent = "Saving…";

    fetch("/api/portfolios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, cashBalance }),
    })
      .then((r) => r.json())
      .then(() => {
        status.textContent = "Saved";
        form.reset();
        return loadPortfolios();
      })
      .finally(() => {
        submit.disabled = false;
      });
  });
}

window.addEventListener("DOMContentLoaded", () => {
  setupForm();
  loadPortfolios();
});
