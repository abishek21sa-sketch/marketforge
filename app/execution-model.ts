export type ExecutionContext = {
  strategy: string;
  side: string;
  benchmark: string;
  quantity: number;
  route: string;
  horizon?: number;
  participation?: number;
  maxSpread?: number;
  venue?: string;
  calibrated?: boolean;
};

export function isValidOrderQuantity(quantity: number): boolean {
  return Number.isInteger(quantity) && quantity >= 100 && quantity % 100 === 0;
}

export function matchesExecutionConfiguration(saved: ExecutionContext, current: ExecutionContext): boolean {
  return saved.strategy === current.strategy
    && saved.side === current.side
    && saved.benchmark === current.benchmark
    && saved.quantity === current.quantity
    && saved.route === current.route
    && saved.horizon === current.horizon
    && saved.participation === current.participation
    && saved.maxSpread === current.maxSpread
    && saved.venue === current.venue
    && (saved.calibrated ?? false) === (current.calibrated ?? false);
}
