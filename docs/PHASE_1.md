# MarketForge — Phase 1 boundary

## What exists now

- A paper-only execution lab shell for exploring a single instrument.
- Explicit domain types for instruments, quotes, trades, order-book snapshots, parent orders, child orders, fills, benchmarks, and execution reports.
- A small deterministic NVDA fixture representing a reconstructed quote/trade stream and top-of-book snapshot.
- A first thin vertical slice: read the spread timeline, inspect the reconstructed book, configure one parent order, run a basic TWAP/VWAP-style schedule, and review projected fill/slippage metrics.

## What is deliberately out of scope

No live market data, exchange simulator, broker connection, order submission, authentication, durable database, venue-specific matching engine, or full strategy library is included in Phase 1.

## Next phases

1. **Phase 2 — Microstructure depth:** venue-aware books, queue position, event replay controls, and richer market-impact features.
2. **Phase 3 — Execution research:** POV, implementation shortfall, arrival-price attribution, parameter sweeps, and experiment comparison.
3. **Phase 4 — Production surfaces:** persisted research runs, portfolio-level reporting, permissions, and optional broker adapters behind explicit safety gates.

All future routing remains paper/simulation-only until a separate product decision explicitly authorizes live trading work.

## Current implementation boundary

- The venue routing estimate now scores the illustrative venue snapshots by displayed spread, queue quality, latency, and displayed depth. It remains a deterministic fixture model, not an order-book replay or queue-position simulator.
- The research workbench runs a deterministic 3-by-3 strategy/horizon sweep and exports its assumptions and results as CSV. Existing ledger data can be summarized as share-weighted paper-run exposure and modeled cost, converted using the $182.21 arrival-price fixture.
- The ledger and imported tape remain in browser `localStorage` and are capped to the most recent 25 runs. JSON export/import is the portable backup path; there is no server-side database, account, cross-device synchronization, or team sharing.
- Secure permissions are not implemented. A client-side role selector would not protect data or actions; shared workspaces require a selected identity provider, server-side authorization, and durable storage before they can be represented as access-controlled.
- No broker, live market-data feed, live order submission, or live routing is included.
