import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildParameterSweep,
  estimateRoutingDrag,
  estimateScenario,
  rankVenueAllocations,
  summarizePortfolio,
  type VenueSnapshot,
} from './research-model.ts';

const venues: VenueSnapshot[] = [
  {
    venue: 'FAST',
    bid: 100,
    ask: 100.02,
    latencyMs: 0.5,
    queueQuality: 80,
    displayedDepth: 2_000,
  },
  {
    venue: 'SLOW',
    bid: 100,
    ask: 100.04,
    latencyMs: 3,
    queueQuality: 20,
    displayedDepth: 700,
  },
];

test('venue weights normalize exactly and react to routing policy inputs', () => {
  for (const policy of ['Balanced', 'Queue-aware', 'Latency-aware'] as const) {
    const allocations = rankVenueAllocations(venues, policy, 'SLOW');
    assert.equal(
      allocations.reduce((sum, venue) => sum + venue.weight, 0),
      100,
    );
    assert.ok(allocations.every((venue) => venue.weight >= 0));
  }
  const noQueueSignal = rankVenueAllocations(
    venues.map((venue) => ({ ...venue, queueQuality: 0 })),
    'Queue-aware',
  );
  assert.equal(
    noQueueSignal.reduce((sum, venue) => sum + venue.weight, 0),
    100,
  );
  const queueAware = rankVenueAllocations(venues, 'Queue-aware');
  assert.ok(queueAware.find((venue) => venue.venue === 'FAST')!.weight > 80);
  assert.ok(
    estimateRoutingDrag(
      rankVenueAllocations(venues, 'Queue-aware'),
      'Queue-aware',
    ) <
      estimateRoutingDrag(rankVenueAllocations(venues, 'Balanced'), 'Balanced'),
  );
});

test('parameter sweep is a deterministic 3-by-3 strategy/horizon grid', () => {
  const input = {
    quantity: 25_000,
    side: 'Buy' as const,
    benchmark: 'Arrival' as const,
    participation: 10,
    routingDrag: 0.2,
  };
  const sweep = buildParameterSweep(input);
  assert.equal(sweep.length, 9);
  assert.equal(
    new Set(sweep.map((item) => item.strategy + item.horizon)).size,
    9,
  );
  const short = estimateScenario(input, 'TWAP', 5);
  const long = estimateScenario(input, 'TWAP', 30);
  assert.ok(long.slippageBps < short.slippageBps);
  assert.ok(long.estimatedCost > 0);
});

test('portfolio aggregates are share-weighted and empty ledgers are safe', () => {
  const summary = summarizePortfolio([
    {
      strategy: 'TWAP',
      quantity: 10_000,
      slippage: '2.0',
      fill: '90',
      cost: '200',
      costModel: 2,
    },
    {
      strategy: 'VWAP',
      quantity: 30_000,
      slippage: '4.0',
      fill: '98',
      cost: '1200',
      costModel: 2,
    },
  ]);
  assert.equal(summary.runCount, 2);
  assert.equal(summary.totalShares, 40_000);
  assert.equal(summary.estimatedCost, 1_400);
  assert.equal(summary.weightedSlippageBps, 3.5);
  assert.equal(summary.weightedFillPct, 96);
  assert.deepEqual(summarizePortfolio([]), {
    runCount: 0,
    totalShares: 0,
    estimatedCost: 0,
    weightedSlippageBps: 0,
    weightedFillPct: 0,
    strategies: [],
  });
  assert.equal(
    summarizePortfolio([
      {
        strategy: 'TWAP',
        quantity: 10_000,
        slippage: '2.0',
        fill: '90',
        cost: '200',
      },
    ]).estimatedCost,
    364.42,
  );
});
