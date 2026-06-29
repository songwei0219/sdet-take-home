// Mock Portfolio Management API — stands in for an Eze Eclipse-style service.
// Intentionally small and dependency-light so the take-home runs offline with
// no external API. Starts on http://localhost:3001.
//
// NOTE TO CANDIDATE: this file is part of the "system under test." You may read
// it, and you may fix it if you determine a defect lives here rather than in a
// test. If you change it, say so (and why) in FINDINGS.md.

const http = require("http");

// ---- in-memory data ---------------------------------------------------------

function seedPortfolios() {
  return [
    {
      id: 1,
      name: "Growth Fund A",
      cashBalance: 50000,
      positions: [
        { symbol: "AAPL", quantity: 100, costBasis: 120.0, currentPrice: 150.25 },
        { symbol: "MSFT", quantity: 200, costBasis: 280.0, currentPrice: 300.75 },
      ],
    },
    {
      id: 2,
      name: "Income Fund B",
      cashBalance: 25000,
      positions: [
        { symbol: "T", quantity: 500, costBasis: 18.5, currentPrice: 16.9 },
      ],
    },
  ];
}

let portfolios = seedPortfolios();
let nextId = 3;

// ---- domain calculations ----------------------------------------------------

// Market value of a single position.
function positionMarketValue(p) {
  return p.quantity * p.currentPrice;
}

// Unrealized P&L for a position: (current - cost) * quantity.
function positionPnl(p) {
  // PLANTED BUG (#1): cost basis and current price are swapped, so P&L has the
  // wrong sign. A correct implementation is (currentPrice - costBasis) * qty.
  return (p.costBasis - p.currentPrice) * p.quantity;
}

// Total portfolio value = cash + sum of position market values.
function portfolioTotalValue(pf) {
  const positionsValue = pf.positions.reduce(
    (sum, p) => sum + positionMarketValue(p),
    0
  );
  return pf.cashBalance + positionsValue;
}

function serialize(pf) {
  return {
    id: pf.id,
    name: pf.name,
    cashBalance: pf.cashBalance,
    totalValue: portfolioTotalValue(pf),
    totalPnl: pf.positions.reduce((sum, p) => sum + positionPnl(p), 0),
    positions: pf.positions.map((p) => ({
      ...p,
      marketValue: positionMarketValue(p),
      pnl: positionPnl(p),
    })),
  };
}

// ---- tiny router ------------------------------------------------------------

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve(null); // signal malformed JSON
      }
    });
  });
}

// Serve the static single-page UI from app/public/.
function serveStatic(req, res, pathname) {
  const fs = require("fs");
  const path = require("path");
  const rel = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.join(__dirname, "public", rel);
  // contain to public/
  if (!filePath.startsWith(path.join(__dirname, "public"))) {
    return sendJson(res, 404, { error: "not found" });
  }
  fs.readFile(filePath, (err, data) => {
    if (err) return sendJson(res, 404, { error: "not found" });
    const ext = path.extname(filePath);
    const type =
      ext === ".html" ? "text/html" : ext === ".js" ? "text/javascript" : "text/plain";
    res.writeHead(200, { "Content-Type": type });
    res.end(data);
  });
  return true;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const parts = url.pathname.split("/").filter(Boolean); // e.g. ["api","portfolios","1"]

  // Static UI: anything that isn't /api/* or /admin/*.
  if (req.method === "GET" && parts[0] !== "api" && parts[0] !== "admin") {
    return serveStatic(req, res, url.pathname);
  }

  // GET /api/portfolios  (supports ?slow=1 to simulate a slow backend for the UI)
  if (req.method === "GET" && parts.length === 2 && parts[1] === "portfolios") {
    return sendJson(res, 200, portfolios.map(serialize));
  }

  // GET /api/portfolios/:id
  if (req.method === "GET" && parts.length === 3 && parts[1] === "portfolios") {
    const pf = portfolios.find((p) => p.id === Number(parts[2]));
    if (!pf) return sendJson(res, 404, { error: "portfolio not found" });
    return sendJson(res, 200, serialize(pf));
  }

  // POST /api/portfolios   { name, cashBalance }
  // Deliberately responds after ~600ms to simulate a real backend round-trip.
  // The UI shows a "Saving…" state until it resolves; tests must wait on the
  // network call (cy.intercept alias), not a fixed sleep.
  if (req.method === "POST" && parts.length === 2 && parts[1] === "portfolios") {
    const body = await readBody(req);
    if (!body || typeof body.name !== "string" || !body.name.trim()) {
      return sendJson(res, 400, { error: "name is required" });
    }
    const pf = {
      id: nextId++,
      name: body.name.trim(),
      cashBalance: Number(body.cashBalance) || 0,
      positions: [],
    };
    portfolios.push(pf);
    setTimeout(() => sendJson(res, 201, serialize(pf)), 600);
    return;
  }

  // POST /api/portfolios/:id/trades   { symbol, quantity, price, side }
  // Executes a BUY or SELL: adjusts cash and positions.
  if (
    req.method === "POST" &&
    parts.length === 4 &&
    parts[1] === "portfolios" &&
    parts[3] === "trades"
  ) {
    const pf = portfolios.find((p) => p.id === Number(parts[2]));
    if (!pf) return sendJson(res, 404, { error: "portfolio not found" });

    const body = await readBody(req);
    if (!body) return sendJson(res, 400, { error: "malformed JSON" });
    const { symbol, quantity, price, side } = body;
    if (!symbol || !(quantity > 0) || !(price > 0) || !["buy", "sell"].includes(side)) {
      return sendJson(res, 400, { error: "invalid trade" });
    }

    const cost = quantity * price;
    if (side === "buy") {
      if (cost > pf.cashBalance) {
        return sendJson(res, 422, { error: "insufficient cash" });
      }
      pf.cashBalance -= cost;
      const existing = pf.positions.find((p) => p.symbol === symbol);
      if (existing) {
        // blended cost basis
        const totalQty = existing.quantity + quantity;
        existing.costBasis =
          (existing.costBasis * existing.quantity + price * quantity) / totalQty;
        existing.quantity = totalQty;
        existing.currentPrice = price;
      } else {
        pf.positions.push({ symbol, quantity, costBasis: price, currentPrice: price });
      }
    } else {
      const existing = pf.positions.find((p) => p.symbol === symbol);
      if (!existing || existing.quantity < quantity) {
        return sendJson(res, 422, { error: "insufficient shares" });
      }
      existing.quantity -= quantity;
      pf.cashBalance += cost;
      if (existing.quantity === 0) {
        pf.positions = pf.positions.filter((p) => p.symbol !== symbol);
      }
    }
    return sendJson(res, 200, serialize(pf));
  }

  // POST /api/admin/reset — restore seed data (test isolation hook).
  if (req.method === "POST" && parts.length === 3 && parts[1] === "admin" && parts[2] === "reset") {
    portfolios = seedPortfolios();
    nextId = 3;
    return sendJson(res, 200, { ok: true });
  }

  sendJson(res, 404, { error: "not found" });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Mock Portfolio API listening on http://localhost:${PORT}`);
});

module.exports = server;
