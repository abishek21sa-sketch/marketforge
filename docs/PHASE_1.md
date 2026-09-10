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
