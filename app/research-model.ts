export type ResearchStrategy = 'TWAP' | 'VWAP' | 'POV';
export type ResearchHorizon = 5 | 15 | 30;
export type RoutePolicy = 'Balanced' | 'Queue-aware' | 'Latency-aware';

export type VenueSnapshot = {
  venue: string;
  bid: number;
  ask: number;
  latencyMs: number;
  queueQuality: number;
  displayedDepth: number;
};

export type RankedVenue = VenueSnapshot & {
  spreadBps: number;
  score: number;
  weight: number;
};

export function rankVenueAllocations(
  venues: VenueSnapshot[],
  policy: RoutePolicy,
  activeVenue?: string,
): RankedVenue[] {
  if (venues.length === 0) return [];
  const scored = venues.map((venue) => {
    const mid = (venue.bid + venue.ask) / 2;
    const spreadBps = mid > 0 ? ((venue.ask - venue.bid) / mid) * 10_000 : 0;
    const depthFactor = Math.sqrt(Math.max(0, venue.displayedDepth));
    const spreadFactor = 1 / Math.max(0.25, spreadBps);
    const queueFactor = Math.max(0, venue.queueQuality) / 100;
    const latencyFactor = 1 / Math.max(0.1, venue.latencyMs);
    const baseScore =
      policy === 'Queue-aware'
        ? depthFactor * spreadFactor * queueFactor * latencyFactor
        : policy === 'Latency-aware'
          ? depthFactor * spreadFactor * latencyFactor ** 1.5
          : depthFactor * spreadFactor;
    return {
      ...venue,
      spreadBps,
      score: baseScore * (venue.venue === activeVenue ? 1.08 : 1),
    };
  });
  const total = scored.reduce((sum, venue) => sum + venue.score, 0);
  if (!Number.isFinite(total) || total <= 0) {
    const baseWeight = Math.floor(100 / scored.length);
    const extraPoints = 100 - baseWeight * scored.length;
    return scored.map((venue, index) => ({
      ...venue,
      weight: baseWeight + (index < extraPoints ? 1 : 0),
    }));
  }

  const fractional = scored.map((venue) => {
    const exact = (venue.score / total) * 100;
    return { ...venue, weight: Math.floor(exact), remainder: exact % 1 };
  });
  const pointsLeft =
    100 - fractional.reduce((sum, venue) => sum + venue.weight, 0);
  const order = [...fractional].sort((a, b) => b.remainder - a.remainder);
  const extra = new Set(order.slice(0, pointsLeft).map((venue) => venue.venue));
  return fractional.map(({ remainder: _remainder, ...venue }) => ({
    ...venue,
    weight: venue.weight + (extra.has(venue.venue) ? 1 : 0),
  }));
}

export function estimateRoutingDrag(
  venues: RankedVenue[],
  policy: RoutePolicy,
): number {
  const weighted = venues.reduce(
    (sum, venue) => {
      const weight = venue.weight / 100;
      return {
        queue: sum.queue + venue.queueQuality * weight,
        latency: sum.latency + venue.latencyMs * weight,
        spread: sum.spread + venue.spreadBps * weight,
      };
    },
    { queue: 0, latency: 0, spread: 0 },
  );
  const routeAdjustment =
    policy === 'Queue-aware' ? -0.12 : policy === 'Latency-aware' ? -0.08 : 0;
  const drag =
    (50 - weighted.queue) * 0.012 +
    Math.max(0, weighted.latency - 1) * 0.1 +
    Math.max(0, weighted.spread - 0.7) * 0.08 +
    routeAdjustment;
  return Math.max(-0.35, Math.min(0.75, drag));
}

export type SweepInput = {
  quantity: number;
  referencePrice?: number;
  side: 'Buy' | 'Sell';
  benchmark: 'Arrival' | 'VWAP' | 'Close';
  participation: number;
  routingDrag: number;
};

export type SweepResult = SweepInput & {
  strategy: ResearchStrategy;
  horizon: ResearchHorizon;
  slippageBps: number;
  fillPct: number;
  estimatedCost: number;
};

export function estimateScenario(
  input: SweepInput,
  strategy: ResearchStrategy,
  horizon: ResearchHorizon,
): SweepResult {
  const scale = Math.min(input.quantity / 25_000, 3);
  const strategyFactor =
    strategy === 'TWAP' ? 1.8 : strategy === 'VWAP' ? 1.35 : 1.05;
  const participationDrag =
    strategy === 'POV' ? (input.participation / 10) * 0.65 : 0;
  const horizonDrag = horizon === 5 ? 1.9 : horizon === 15 ? 0.4 : 0.1;
  const benchmarkDrag =
    input.benchmark === 'VWAP' ? -0.6 : input.benchmark === 'Close' ? 1.1 : 0;
  const sideDrag = input.side === 'Sell' ? 0.25 : 0;
  const slippageBps = Math.max(
    0.8,
    4.7 +
      scale * strategyFactor +
      participationDrag +
      horizonDrag +
      benchmarkDrag +
      sideDrag +
      input.routingDrag,
  );
  const fillPct = Math.min(
    99.2,
    Math.max(0, 95.8 + horizon / 12 - scale * 0.35 - participationDrag * 0.15),
  );
  return {
    ...input,
    strategy,
    horizon,
    slippageBps,
    fillPct,
    estimatedCost:
      (slippageBps * input.quantity * (input.referencePrice ?? 182.21)) /
      10_000,
  };
}

export function buildParameterSweep(input: SweepInput): SweepResult[] {
  const strategies: ResearchStrategy[] = ['TWAP', 'VWAP', 'POV'];
  const horizons: ResearchHorizon[] = [5, 15, 30];
  return strategies.flatMap((strategy) =>
    horizons.map((horizon) => estimateScenario(input, strategy, horizon)),
  );
}

export type PortfolioSummary = {
  runCount: number;
  totalShares: number;
  estimatedCost: number;
  weightedSlippageBps: number;
  weightedFillPct: number;
  strategies: {
    strategy: string;
    runs: number;
    shares: number;
    cost: number;
  }[];
};

export type PortfolioRun = {
  strategy: string;
  quantity: number;
  slippage: string;
  fill: string;
  cost?: string;
  costModel?: number;
  referencePrice?: number;
};

function portfolioRunCost(run: PortfolioRun): number {
  if (run.costModel === 2 && Number.isFinite(Number(run.cost)))
    return Number(run.cost);
  const referencePrice =
    Number.isFinite(run.referencePrice) && (run.referencePrice ?? 0) > 0
      ? (run.referencePrice ?? 182.21)
      : 182.21;
  return (Number(run.slippage) * run.quantity * referencePrice) / 10_000;
}

export function summarizePortfolio(runs: PortfolioRun[]): PortfolioSummary {
  const validRuns = runs.filter(
    (run) =>
      Number.isFinite(run.quantity) &&
      run.quantity > 0 &&
      Number.isFinite(Number(run.slippage)) &&
      Number.isFinite(Number(run.fill)),
  );
  const totalShares = validRuns.reduce((sum, run) => sum + run.quantity, 0);
  const estimatedCost = validRuns.reduce(
    (sum, run) => sum + portfolioRunCost(run),
    0,
  );
  const weightedSlippageBps =
    totalShares === 0
      ? 0
      : validRuns.reduce(
          (sum, run) => sum + Number(run.slippage) * run.quantity,
          0,
        ) / totalShares;
  const weightedFillPct =
    totalShares === 0
      ? 0
      : validRuns.reduce(
          (sum, run) => sum + Number(run.fill) * run.quantity,
          0,
        ) / totalShares;
  const byStrategy = new Map<
    string,
    { strategy: string; runs: number; shares: number; cost: number }
  >();
  for (const run of validRuns) {
    const prior = byStrategy.get(run.strategy) ?? {
      strategy: run.strategy,
      runs: 0,
      shares: 0,
      cost: 0,
    };
    prior.runs += 1;
    prior.shares += run.quantity;
    prior.cost += portfolioRunCost(run);
    byStrategy.set(run.strategy, prior);
  }
  return {
    runCount: validRuns.length,
    totalShares,
    estimatedCost,
    weightedSlippageBps,
    weightedFillPct,
    strategies: [...byStrategy.values()].sort((a, b) => b.runs - a.runs),
  };
}
