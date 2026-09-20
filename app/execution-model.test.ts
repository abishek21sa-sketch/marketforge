import assert from 'node:assert/strict';
import test from 'node:test';
import { isValidOrderQuantity, matchesExecutionConfiguration, type ExecutionContext } from './execution-model.ts';

test('paper order quantities must be whole 100-share lots from 100 upward', () => {
  for (const quantity of [100, 200, 25_000, 100_000]) assert.equal(isValidOrderQuantity(quantity), true);
  for (const quantity of [0, 99, 101, 250.5, -100, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(isValidOrderQuantity(quantity), false, `expected ${quantity} to be rejected`);
  }
});

test('a paper run only matches when every result-affecting control matches', () => {
  const baseline: ExecutionContext = {
    strategy: 'TWAP', side: 'Buy', benchmark: 'Arrival', quantity: 25_000,
    route: 'Balanced', horizon: 15, participation: 10, maxSpread: 3,
    venue: 'XNAS', calibrated: false,
  };
  assert.equal(matchesExecutionConfiguration(baseline, { ...baseline }), true);

  const changedContexts: ExecutionContext[] = [
    { ...baseline, strategy: 'VWAP' },
    { ...baseline, side: 'Sell' },
    { ...baseline, benchmark: 'Close' },
    { ...baseline, quantity: 50_000 },
    { ...baseline, route: 'Queue-aware' },
    { ...baseline, horizon: 30 },
    { ...baseline, participation: 20 },
    { ...baseline, maxSpread: 5 },
    { ...baseline, venue: 'BATS' },
    { ...baseline, calibrated: true },
  ];
  for (const current of changedContexts) assert.equal(matchesExecutionConfiguration(baseline, current), false);
});
