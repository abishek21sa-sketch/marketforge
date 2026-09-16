'use client';

import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { Activity, ArrowDownRight, ArrowUpRight, BarChart3, BookOpen, Clipboard, ChevronDown, Download, CircleHelp, Clock3, Gauge, Layers3, LineChart, Pause, Play, Radio, Settings2, ShieldCheck, SlidersHorizontal, Sparkles, Target, TerminalSquare, Zap } from 'lucide-react';

const prints = [
  ['09:41:00','buy','182.41','420','XNAS'],['09:41:03','sell','182.40','185','BATS'],
  ['09:41:07','buy','182.42','760','XNAS'],['09:41:13','buy','182.43','220','EDGX'],
  ['09:41:18','sell','182.42','510','XNAS'],['09:41:25','buy','182.44','340','ARCX'],
];
const book = [['182.46',530,'ask'],['182.45',286,'ask'],['182.44',712,'ask'],['182.43',460,'ask'],['182.42',890,'mid'],['182.41',650,'bid'],['182.40',480,'bid'],['182.39',920,'bid'],['182.38',760,'bid']];
const venueQuotes = [['XNAS','182.41','182.43','0.9ms','62%'],['BATS','182.40','182.42','1.2ms','48%'],['EDGX','182.41','182.44','1.5ms','31%'],['ARCX','182.40','182.43','1.8ms','22%']];
const chartPaths: Record<'1m'|'5m'|'30m', string> = { '1m': '0,104 46,101 92,108 138,91 184,94 230,82 276,88 322,71 368,76 414,61 460,66 506,51 552,56 598,39 644,44 690,29', '5m': '0,148 46,135 92,141 138,115 184,122 230,96 276,104 322,79 368,88 414,60 460,66 506,38 552,50 598,25 644,32 690,14', '30m': '0,132 46,119 92,125 138,138 184,111 230,102 276,113 322,88 368,96 414,73 460,84 506,57 552,64 598,46 644,52 690,22' };
const chartTicks: Record<'1m'|'5m'|'30m', string[]> = { '1m': ['09:41:00','09:41:15','09:41:30','09:41:45','09:42:00'], '5m': ['09:36:00','09:37:30','09:39:00','09:40:30','09:42:00'], '30m': ['09:12:00','09:19:30','09:27:00','09:34:30','09:42:00'] };

function Metric({ label, value, note, tone = '' }: { label: string; value: string; note: string; tone?: string }) {
  return <div className="metric-card"><div className="eyebrow">{label}</div><div className={'metric-value ' + tone}>{value}</div><div className="metric-note">{note}</div></div>;
}

type LedgerItem = { id: number; strategy: string; side: string; benchmark: string; slippage: string; fill: string; quantity: number; route: string; horizon?: number; participation?: number; maxSpread?: number; createdAt?: string };
const SESSION_KEY = 'marketforge-execution-session-v1';
export default function Home() {
  const [window, setWindow] = useState<'1m'|'5m'|'30m'>('5m');
  const [activeNav, setActiveNav] = useState('execution-lab');
  const [showHelp, setShowHelp] = useState(false);
  const [isAutoReplay, setIsAutoReplay] = useState(false);
  const [copyState, setCopyState] = useState('Copy summary');
  const [exportState, setExportState] = useState('Export CSV');
  const [jsonExportState, setJsonExportState] = useState('Export JSON');
  const [mode, setMode] = useState<'TWAP'|'VWAP'|'POV'>('TWAP');
  const [side, setSide] = useState<'Buy'|'Sell'>('Buy');
  const [benchmark, setBenchmark] = useState<'Arrival'|'VWAP'|'Close'>('Arrival');
  const [quantity, setQuantity] = useState(25000);
  const [horizon, setHorizon] = useState(15);
  const [participation, setParticipation] = useState(10);
  const [routePolicy, setRoutePolicy] = useState<'Balanced'|'Queue-aware'|'Latency-aware'>('Balanced');
  const [maxSpread, setMaxSpread] = useState(3);
  const [run, setRun] = useState(1);
  const [lastRunNotice, setLastRunNotice] = useState('Ready to simulate');
  const [history, setHistory] = useState<LedgerItem[]>([]);
  const [loadedRunId, setLoadedRunId] = useState<number | null>(null);
  const [storageReady, setStorageReady] = useState(false);
  const [calibrated, setCalibrated] = useState(false);
  const [calibrationCycle, setCalibrationCycle] = useState(0);
  const [replayIndex, setReplayIndex] = useState(5);
  const [printFilter, setPrintFilter] = useState<'All'|'Buys'|'Sells'>('All');
  const activePrint = prints[replayIndex];
  const visiblePrints = printFilter === 'All' ? prints : prints.filter(([, printSide]) => printSide === printFilter.slice(0, -1).toLowerCase());
  useEffect(() => {
    if (!isAutoReplay) return;
    const timer = globalThis.setInterval(() => setReplayIndex((index) => (index + 1) % prints.length), 1400);
    return () => globalThis.clearInterval(timer);
  }, [isAutoReplay]);
  const activeChartPoint = useMemo(() => {
    const points = chartPaths[window].split(' ').map((point) => point.split(',').map(Number));
    const pointIndex = Math.round((replayIndex / (prints.length - 1)) * (points.length - 1));
    return points[pointIndex] ?? [0, 0];
  }, [replayIndex, window]);
  const result = useMemo(() => {
    const scale = Math.min(quantity / 25000, 3);
    const benchmarkAdj = benchmark === 'VWAP' ? -0.6 : benchmark === 'Close' ? 1.1 : 0;
    const sideAdj = side === 'Sell' ? 0.25 : 0;
    const modeFactor = mode === 'TWAP' ? 1.8 : mode === 'VWAP' ? 1.35 : 1.05;
    const participationAdj = mode === 'POV' ? (participation / 10) * .65 : 0;
    const venueMix = (routePolicy === 'Queue-aware' ? [['XNAS','49%','teal'],['BATS','28%','blue'],['EDGX','15%','orange'],['ARCX','8%','faint']] : routePolicy === 'Latency-aware' ? [['XNAS','55%','teal'],['BATS','26%','blue'],['EDGX','13%','orange'],['ARCX','6%','faint']] : [['XNAS','42%','teal'],['BATS','31%','blue'],['EDGX','17%','orange'],['ARCX','10%','faint']]);
    const quotedSpread = 2.0;
    const spreadCheck = quotedSpread <= maxSpread;
    const quantityValid = quantity >= 100;
    const bookCoverage = quantityValid && quantity <= 50000;
    const checks = [{ label: 'Spread guard', value: spreadCheck ? 'PASS' : 'HOLD', detail: quotedSpread.toFixed(1) + '¢ inside ' + maxSpread.toFixed(1) + '¢ limit', tone: spreadCheck ? 'good' : 'warn' }, { label: 'Book coverage', value: !quantityValid ? 'HOLD' : bookCoverage ? 'COVERED' : 'STRETCHED', detail: !quantityValid ? 'Minimum working clip is 100 shares' : bookCoverage ? 'Top venues cover the working clip' : 'Split the parent order before routing', tone: !quantityValid || !bookCoverage ? 'warn' : 'good' }, { label: 'Route posture', value: routePolicy.toUpperCase(), detail: mode === 'POV' ? participation + '% participation cap' : mode + ' schedule', tone: 'good' }];
    const baseSlippage = 4.7 + scale * modeFactor + participationAdj + (horizon < 10 ? 1.9 : 0) + sideAdj;
    const slippage = Math.max(.8, baseSlippage + benchmarkAdj).toFixed(1);
    const spread = mode === 'TWAP' ? 1.2 : mode === 'VWAP' ? 1.0 : .9;
    const impact = mode === 'TWAP' ? 2.8 : mode === 'VWAP' ? 2.1 : 1.8;
    const timing = Math.max(0, Number(slippage) - spread - impact).toFixed(1);
    const sweep = [5000, 25000, 50000, 100000].map((size) => ({ size, value: Math.max(.8, 4.7 + (size / 25000) * modeFactor + participationAdj + (horizon < 10 ? 1.9 : 0) + benchmarkAdj + sideAdj).toFixed(1) }));
    const comparison = ['TWAP', 'VWAP', 'POV'].map((strategy) => { const factor = strategy === 'TWAP' ? 1.8 : strategy === 'VWAP' ? 1.35 : 1.05; const povAdj = strategy === 'POV' ? participationAdj : 0; return { strategy, value: Math.max(.8, 4.7 + scale * factor + povAdj + (horizon < 10 ? 1.9 : 0) + benchmarkAdj + sideAdj).toFixed(1) }; });
    const benchmarkMarks = [{ label: 'Arrival', value: baseSlippage }, { label: 'Session VWAP', value: baseSlippage - .6 }, { label: 'Close', value: baseSlippage + 1.1 }].map((item) => ({ ...item, value: Math.max(.8, item.value).toFixed(1) }));
    return { slippage, fill: Math.min(99.2, 96.4 + horizon / 12 - scale * .35).toFixed(1), cost: (Number(slippage) * quantity * .01).toFixed(0), sweep, comparison, benchmarkMarks, venueMix, checks, breakdown: [{ label: 'Spread', value: spread.toFixed(1), tone: 'teal' }, { label: 'Market impact', value: impact.toFixed(1), tone: 'orange' }, { label: 'Timing', value: timing, tone: 'red' }] };
  }, [benchmark, horizon, maxSpread, mode, participation, quantity, routePolicy, side]);

  const venueCalibration = useMemo(() => {
    const scored = venueQuotes.map(([venue, , , latency, queue]) => {
      const queueScore = Number(queue.replace('%', ''));
      const latencyMs = Number(latency.replace('ms', ''));
      const eventBias = activePrint[4] === venue ? 1.12 : 1;
      const cycleBias = 1 + (calibrationCycle % 3) * 0.02;
      return { venue, queue: queueScore, latency: latencyMs, score: (queueScore / latencyMs) * eventBias * cycleBias };
    });
    const totalScore = scored.reduce((total, item) => total + item.score, 0);
    return scored.map((item) => ({ ...item, weight: Math.round((item.score / totalScore) * 100) }));
  }, [activePrint, calibrationCycle]);
  const activeVenueMix = calibrated
    ? venueCalibration.map((item, index) => [item.venue, item.weight + '%', ['teal', 'blue', 'orange', 'faint'][index]] as [string, string, string])
    : result.venueMix;
  const activeVenueProfile = venueCalibration.find((item) => item.venue === activePrint[4]);
  const scheduleSlices = useMemo(() => {
    const sliceCount = 6;
    const startMinutes = 9 * 60 + 36;
    return Array.from({ length: sliceCount }, (_, index) => {
      const offset = Math.round((horizon / (sliceCount - 1)) * index);
      const totalMinutes = startMinutes + offset;
      const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
      const minutes = String(totalMinutes % 60).padStart(2, '0');
      const baseQuantity = Math.floor(quantity / sliceCount);
      const remainder = quantity - baseQuantity * sliceCount;
      return { time: hours + ':' + minutes, quantity: baseQuantity + (index < remainder ? 1 : 0), filled: index < 3 };
    });
  }, [horizon, quantity]);  const selectPrint = (time: string, price: string) => {
    const nextIndex = prints.findIndex(([printTime, , printPrice]) => printTime === time && printPrice === price);
    if (nextIndex >= 0) {
      setIsAutoReplay(false);
      setReplayIndex(nextIndex);
      setActiveNav('replay');
    }
  };
  const advanceReplay = () => {
    setIsAutoReplay(false);
    setReplayIndex((index) => (index + 1) % prints.length);
  };
  const toggleAutoReplay = () => setIsAutoReplay((value) => !value);
  const refreshCalibration = () => {
    setCalibrated(true);
    setCalibrationCycle((cycle) => cycle + 1);
    advanceReplay();
  };
  const buildLedgerItem = useCallback((id: number): LedgerItem => ({ id, strategy: mode, side, benchmark, slippage: result.slippage, fill: result.fill, quantity, route: routePolicy, horizon, participation, maxSpread, createdAt: new Date().toISOString() }), [benchmark, horizon, maxSpread, mode, participation, quantity, result.fill, result.slippage, routePolicy, side]);
  const loadLedgerItem = (item: LedgerItem) => {
    if (item.strategy === 'TWAP' || item.strategy === 'VWAP' || item.strategy === 'POV') setMode(item.strategy);
    if (item.side === 'Buy' || item.side === 'Sell') setSide(item.side);
    if (item.benchmark === 'Arrival' || item.benchmark === 'VWAP' || item.benchmark === 'Close') setBenchmark(item.benchmark);
    if (item.route === 'Balanced' || item.route === 'Queue-aware' || item.route === 'Latency-aware') setRoutePolicy(item.route);
    if (typeof item.quantity === 'number') setQuantity(item.quantity);
    if (item.horizon === 5 || item.horizon === 15 || item.horizon === 30) setHorizon(item.horizon);
    if (item.participation === 5 || item.participation === 10 || item.participation === 20) setParticipation(item.participation);
    if (item.maxSpread === 2 || item.maxSpread === 3 || item.maxSpread === 5) setMaxSpread(item.maxSpread);
    setLastRunNotice(`Loaded paper run #${String(item.id).padStart(2, '0')}`);
    setLoadedRunId(item.id);
    setActiveNav('execution-lab');
    document.getElementById('execution-lab')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const loadedRun = history.find((item) => item.id === loadedRunId);
  const baselineDelta = loadedRun ? (Number(result.slippage) - Number(loadedRun.slippage)).toFixed(1) : '0.0';
  const recordRun = () => {
    if (quantity < 100) {
      setLastRunNotice('Enter at least 100 shares to simulate');
      return;
    }
    const nextRun = run + 1;
    setRun(nextRun);
    setHistory((items) => [buildLedgerItem(nextRun), ...items].slice(0, 3));
    setLoadedRunId(nextRun);
    setLastRunNotice(`Paper run #${String(nextRun).padStart(2, '0')} pinned to ledger`);
  };
  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const target = event.target;
      const isControl = target instanceof HTMLElement && ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(target.tagName);
      if (!isControl && !event.metaKey && !event.ctrlKey && event.key === 'ArrowRight') {
        event.preventDefault();
        setIsAutoReplay(false);
        setReplayIndex((index) => (index + 1) % prints.length);
        return;
      }
      if (!isControl && !event.metaKey && !event.ctrlKey && event.code === 'Space') {
        event.preventDefault();
        setIsAutoReplay((value) => !value);
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        if (quantity < 100) {
          setLastRunNotice('Enter at least 100 shares to simulate');
          return;
        }
        const nextRun = run + 1;
        setRun(nextRun);
        setHistory((items) => [buildLedgerItem(nextRun), ...items].slice(0, 3));
    setLoadedRunId(nextRun);
        setLastRunNotice(`Paper run #${String(nextRun).padStart(2, '0')} pinned to ledger`);
      }
    };
    globalThis.addEventListener('keydown', handleShortcut);
    return () => globalThis.removeEventListener('keydown', handleShortcut);
  }, [benchmark, buildLedgerItem, mode, quantity, result.fill, result.slippage, run, side]);
  useEffect(() => {
    const restoreId = globalThis.setTimeout(() => {
      try {
        const raw = globalThis.localStorage.getItem(SESSION_KEY);
        if (raw) {
          const saved = JSON.parse(raw) as { run?: unknown; history?: unknown; calibrated?: unknown; calibrationCycle?: unknown; replayIndex?: unknown; window?: unknown; mode?: unknown; side?: unknown; benchmark?: unknown; quantity?: unknown; horizon?: unknown; participation?: unknown; routePolicy?: unknown; maxSpread?: unknown; printFilter?: unknown };
          if (Array.isArray(saved.history)) setHistory(saved.history.slice(0, 3) as LedgerItem[]);
          if (typeof saved.run === 'number') setRun(Math.max(1, saved.run));
          if (typeof saved.calibrated === 'boolean') setCalibrated(saved.calibrated);
          if (typeof saved.replayIndex === 'number') setReplayIndex(Math.max(0, Math.min(prints.length - 1, saved.replayIndex)));
          if (saved.window === '1m' || saved.window === '5m' || saved.window === '30m') setWindow(saved.window);
          if (saved.mode === 'TWAP' || saved.mode === 'VWAP' || saved.mode === 'POV') setMode(saved.mode);
          if (saved.side === 'Buy' || saved.side === 'Sell') setSide(saved.side);
          if (saved.benchmark === 'Arrival' || saved.benchmark === 'VWAP' || saved.benchmark === 'Close') setBenchmark(saved.benchmark);
          if (typeof saved.quantity === 'number') setQuantity(Math.max(100, saved.quantity));
          if (saved.horizon === 5 || saved.horizon === 15 || saved.horizon === 30) setHorizon(saved.horizon);
          if (saved.participation === 5 || saved.participation === 10 || saved.participation === 20) setParticipation(saved.participation);
          if (saved.routePolicy === 'Balanced' || saved.routePolicy === 'Queue-aware' || saved.routePolicy === 'Latency-aware') setRoutePolicy(saved.routePolicy);
          if (saved.maxSpread === 2 || saved.maxSpread === 3 || saved.maxSpread === 5) setMaxSpread(saved.maxSpread);
          if (saved.printFilter === 'All' || saved.printFilter === 'Buys' || saved.printFilter === 'Sells') setPrintFilter(saved.printFilter);
          if (Array.isArray(saved.history) && saved.history.length > 0) setLastRunNotice('Local experiment restored');
        }
      } catch {
        setLastRunNotice('Local session restore unavailable');
      }
      setStorageReady(true);
    }, 0);
    return () => globalThis.clearTimeout(restoreId);
  }, []);
  useEffect(() => {
    if (!storageReady) return;
    try {
      globalThis.localStorage.setItem(SESSION_KEY, JSON.stringify({ run, history, calibrated, replayIndex, window, mode, side, benchmark, quantity, horizon, participation, routePolicy, maxSpread, printFilter }));
    } catch {
      // Storage can be unavailable in private or restricted browser contexts.
    }
  }, [benchmark, calibrated, history, horizon, maxSpread, mode, participation, printFilter, quantity, replayIndex, routePolicy, run, side, storageReady, window]);
  const copySummary = async () => {
    const summary = `NVDA ${side} ${quantity.toLocaleString()} shares · ${mode} · ${benchmark} benchmark · ${horizon} minute horizon · ${result.slippage} bps slippage · ${result.fill}% fill · $${result.cost} estimated impact`;
    try {
      await globalThis.navigator.clipboard.writeText(summary);
      setCopyState('Copied');
      globalThis.setTimeout(() => setCopyState('Copy summary'), 1800);
    } catch {
      setCopyState('Copy unavailable');
    }
  };
  const exportLedger = () => {
    if (history.length === 0) return;
    const rows = [
      ['Run', 'Recorded', 'Side', 'Strategy', 'Benchmark', 'Quantity', 'Horizon (min)', 'Participation (%)', 'Spread limit (¢)', 'Route', 'Slippage (bps)', 'Fill (%)'],
      ...history.map((item) => [item.id, item.createdAt ?? '', item.side, item.strategy, item.benchmark, item.quantity ?? '', item.horizon ?? '', item.participation ?? '', item.maxSpread ?? '', item.route ?? 'Balanced', item.slippage, item.fill]),
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = globalThis.URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `marketforge-ledger-${String(run).padStart(2, '0')}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    globalThis.setTimeout(() => globalThis.URL.revokeObjectURL(url), 0);
    setExportState('Exported');
    globalThis.setTimeout(() => setExportState('Export CSV'), 1800);
  };
  const exportSession = () => {
    const payload = {
      instrument: 'NVDA',
      exportedAt: new Date().toISOString(),
      run,
      calibrated,
      calibrationCycle,
      replay: { window, event: activePrint[0], index: replayIndex },
      order: { mode, side, benchmark, quantity, horizon, participation, routePolicy, maxSpread },
      result,
      history,
    };
    const url = globalThis.URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'marketforge-session-' + String(run).padStart(2, '0') + '.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    globalThis.setTimeout(() => globalThis.URL.revokeObjectURL(url), 0);
    setJsonExportState('Exported');
    globalThis.setTimeout(() => setJsonExportState('Export JSON'), 1800);
  };
  const importSession = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const saved = JSON.parse(await file.text()) as {
        run?: unknown;
        calibrated?: unknown;
        calibrationCycle?: unknown;
        replay?: { window?: unknown; index?: unknown };
        order?: { mode?: unknown; side?: unknown; benchmark?: unknown; quantity?: unknown; horizon?: unknown; participation?: unknown; routePolicy?: unknown; maxSpread?: unknown };
        history?: unknown;
      };
      const order = saved.order;
      if (!order) throw new Error('Missing order configuration');
      if (order.mode === 'TWAP' || order.mode === 'VWAP' || order.mode === 'POV') setMode(order.mode);
      if (order.side === 'Buy' || order.side === 'Sell') setSide(order.side);
      if (order.benchmark === 'Arrival' || order.benchmark === 'VWAP' || order.benchmark === 'Close') setBenchmark(order.benchmark);
      if (typeof order.quantity === 'number') setQuantity(Math.max(0, order.quantity));
      if (order.horizon === 5 || order.horizon === 15 || order.horizon === 30) setHorizon(order.horizon);
      if (order.participation === 5 || order.participation === 10 || order.participation === 20) setParticipation(order.participation);
      if (order.routePolicy === 'Balanced' || order.routePolicy === 'Queue-aware' || order.routePolicy === 'Latency-aware') setRoutePolicy(order.routePolicy);
      if (order.maxSpread === 2 || order.maxSpread === 3 || order.maxSpread === 5) setMaxSpread(order.maxSpread);
      if (saved.replay?.window === '1m' || saved.replay?.window === '5m' || saved.replay?.window === '30m') setWindow(saved.replay.window);
      if (typeof saved.replay?.index === 'number') setReplayIndex(Math.max(0, Math.min(prints.length - 1, saved.replay.index)));
      if (typeof saved.run === 'number') setRun(Math.max(1, saved.run));
      if (typeof saved.calibrated === 'boolean') setCalibrated(saved.calibrated);
      if (typeof saved.calibrationCycle === 'number') setCalibrationCycle(Math.max(0, saved.calibrationCycle));
      if (Array.isArray(saved.history)) setHistory(saved.history.slice(0, 3) as LedgerItem[]);
      setLoadedRunId(null);
      setIsAutoReplay(false);
      setActiveNav('execution-lab');
      document.getElementById('execution-lab')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setLastRunNotice('Session imported · review before simulating');
    } catch {
      setLastRunNotice('Import failed · choose a MarketForge JSON session');
    } finally {
      event.target.value = '';
    }
  };
  const clearLedger = () => {
    setLoadedRunId(null);
    setHistory([]);
    setLastRunNotice('Ledger cleared · ready to simulate');
  };
  const resetSession = () => {
    setIsAutoReplay(false);
    setWindow('5m');
    setMode('TWAP');
    setSide('Buy');
    setBenchmark('Arrival');
    setQuantity(25000);
    setHorizon(15);
    setParticipation(10);
    setRoutePolicy('Balanced');
    setMaxSpread(3);
    setRun(1);
    setLoadedRunId(null);
    setHistory([]);
    setCalibrated(false);
    setCalibrationCycle(0);
    setReplayIndex(5);
    setPrintFilter('All');
    setCopyState('Copy summary');
    setExportState('Export CSV');
    try {
      globalThis.localStorage.removeItem(SESSION_KEY);
    } catch {
      // Storage can be unavailable in private or restricted browser contexts.
    }
    setLastRunNotice('Defaults restored · local session cleared');
  };  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const sectionIds = ['execution-lab', 'book', 'replay', 'reports', 'setup'];
    const visibleSections = new Map<string, number>();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) visibleSections.set(entry.target.id, entry.intersectionRatio);
        else visibleSections.delete(entry.target.id);
      });
      const nextSection = [...visibleSections.entries()].sort(([, left], [, right]) => right - left)[0]?.[0];
      if (nextSection) setActiveNav(nextSection);
    }, { rootMargin: '-88px 0px -48% 0px', threshold: [0.15, 0.4, 0.7] });
    sectionIds.forEach((id) => {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    });
    return () => observer.disconnect();
  }, []);
  const jumpTo = (id: string) => {
    setActiveNav(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  return <main className="app-shell">
    <aside className="sidebar"><div className="brand-mark">MF</div><nav className="side-nav" aria-label="Primary navigation">
      <button className={'nav-item '+(activeNav==='execution-lab'?'active':'')} aria-label="Execution lab" onClick={() => jumpTo('execution-lab')}><LineChart size={18}/><span>Lab</span></button><button className={'nav-item '+(activeNav==='book'?'active':'')} aria-label="Order book" onClick={() => jumpTo('book')}><Layers3 size={18}/><span>Book</span></button><button className={'nav-item '+(activeNav==='replay'?'active':'')} aria-label="Market replay" onClick={() => jumpTo('replay')}><Radio size={18}/><span>Replay</span></button><button className={'nav-item '+(activeNav==='reports'?'active':'')} aria-label="Reports" onClick={() => jumpTo('reports')}><BarChart3 size={18}/><span>Reports</span></button>
    </nav><div className="sidebar-bottom"><button className={'nav-item '+(activeNav==='setup'?'active':'')} aria-label="Settings" onClick={() => jumpTo('setup')}><Settings2 size={18}/><span>Setup</span></button><div className="avatar">AB</div></div></aside>
    <section className="workspace"><header className="topbar"><div className="breadcrumb"><span>MarketForge</span><b>/</b><strong>Execution lab</strong></div><div className="top-actions"><div className="status-dot"><i/> Replay data synced</div><button className="icon-button" aria-label="Help" aria-expanded={showHelp} aria-controls="help-popover" onClick={() => setShowHelp((value) => !value)}><CircleHelp size={17}/></button><button className="icon-button" aria-label="Settings" onClick={() => jumpTo('setup')}><SlidersHorizontal size={17}/></button>{showHelp && <aside id="help-popover" className="help-popover" aria-label="Quick guide"><strong>Quick guide</strong><p>Replay advances the market fixture. Tune the parent order, then run a paper simulation to pin the result.</p><p>Use Setup to recalibrate venue weights against the visible queue and latency snapshot.</p><p>ArrowRight steps replay, Space toggles Auto, and the ledger can export or import JSON sessions.</p></aside>}</div></header>
      <div className="content">
        <div className="page-heading"><div><div className="kicker"><Sparkles size={13}/> PAPER EXECUTION / PHASE 1</div><h1>Read the tape. <em>Route with intent.</em></h1><p>Reconstruct the market, pressure-test a schedule, and see the cost of every decision.</p></div><div className="session-chip"><i/> SIMULATION ONLY <ChevronDown size={14}/></div></div>
        <div className="instrument-bar panel"><div className="instrument-main"><div className="ticker">NVDA</div><div><div className="instrument-name">NVIDIA Corporation <span className="venue-tag">XNAS</span></div><div className="instrument-sub">US Equity · regular session · 09:30—16:00 ET</div></div></div><div className="instrument-price"><strong>182.42</strong><span className="positive"><ArrowUpRight size={14}/> +0.86%</span></div><div className="instrument-stats"><span>Bid <b>182.41</b></span><span>Ask <b>182.43</b></span><span>Spread <b>0.02</b></span></div></div>
        <div id="execution-lab" className="lab-grid"><section id="replay" className="panel tape-panel"><div className="panel-header"><div><div className="section-label"><Activity size={14}/> Market reconstruction</div><h2>Spread &amp; mid-price</h2></div><div className="chart-actions"><div className="segmented">{['1m','5m','30m'].map((item)=><button key={item} className={window===item?'selected':''} onClick={()=>setWindow(item as '1m'|'5m'|'30m')}>{item}</button>)}</div><button className="run-button" onClick={advanceReplay} aria-keyshortcuts="ArrowRight"><Play size={13} fill="currentColor"/> Replay</button><button className={"run-button "+(isAutoReplay ? "active-auto" : "")} onClick={toggleAutoReplay} aria-pressed={isAutoReplay} aria-keyshortcuts="Space">{isAutoReplay ? <Pause size={13} fill="currentColor"/> : <Play size={13} fill="currentColor"/>} {isAutoReplay ? "Pause" : "Auto"}</button></div></div><div className="chart-wrap"><div className="chart-y-axis"><span>182.50</span><span>182.46</span><span>182.42</span><span>182.38</span><span>182.34</span></div><div className="chart-area"><div className="chart-grid-lines"><i/><i/><i/><i/><i/></div><svg viewBox="0 0 690 164" preserveAspectRatio="none" aria-label="Reconstructed mid-price chart"><defs><linearGradient id="areaFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#5de2c0" stopOpacity=".18"/><stop offset="100%" stopColor="#5de2c0" stopOpacity="0"/></linearGradient></defs><polyline points={chartPaths[window]+' 690,164 0,164'} fill="url(#areaFill)"/><polyline points={chartPaths[window]} fill="none" stroke="#63e6c3" strokeWidth="2.5"/><line x1="0" x2="690" y1="83" y2="83" stroke="#f2a65a" strokeDasharray="4 5"/><line x1={activeChartPoint[0]} x2={activeChartPoint[0]} y1="0" y2="164" stroke="#63e6c3" strokeOpacity=".28" strokeDasharray="3 5"/><circle cx={activeChartPoint[0]} cy={activeChartPoint[1]} r="5" fill="var(--bg)" stroke="#63e6c3" strokeWidth="2"/><circle cx="690" cy="14" r="4" fill="#63e6c3"/></svg><div className="chart-x-axis">{chartTicks[window].map((tick)=><span key={tick}>{tick}</span>)}</div><div className="chart-legend"><span><i className="legend-dot"/> Mid-price</span><span><i className="legend-line"/> Arrival mid</span><span><i className="legend-event"/> Active event</span></div></div></div><div className="chart-footer"><span><Clock3 size={14}/> Fixture: NASDAQ ITCH sample · 06 Jun 2024</span><span>Last event <b>{activePrint[0]}.000 ET</b></span><span className="replay-progress">Replay {replayIndex + 1}/{prints.length}</span>{isAutoReplay && <span className="replay-progress">Auto · 1.4s</span>}<span className="positive">+0.11% since arrival</span></div>        <label className="replay-scrubber"><span>Event position</span><input type="range" min="0" max={prints.length - 1} value={replayIndex} onChange={(event) => { setIsAutoReplay(false); setReplayIndex(Number(event.target.value)); }} aria-label="Replay event position"/><output>{replayIndex + 1}/{prints.length}</output></label><div className="replay-inspector"><div><span className="eyebrow">Active event</span><strong>{activePrint[0]} · {activePrint[1].toUpperCase()}</strong></div><div><span className="replay-detail">{activePrint[3]} shares @ \${activePrint[2]}</span><span className="replay-venue">{activePrint[4]} venue</span></div></div></section>
          <section id="book" className="panel book-panel"><div className="panel-header compact"><div><div className="section-label"><BookOpen size={14}/> Reconstructed book</div><h2>Top of book</h2></div><span className="live-tag"><i/> LIVE REPLAY</span></div><div className="book-head"><span>Price</span><span>Size</span></div><div>{book.map(([price,size,side])=><div className={'book-row '+side} key={price as string}><span className="depth" style={{width:Math.min(92,(size as number)/10)+'%'}}/><span>{price as string}</span><span>{(size as number).toLocaleString()}</span></div>)}</div><div className="microprice"><span>Microprice</span><strong>182.425</strong><span className="positive">+0.005 bias</span></div><div className="venue-depth"><div className="venue-depth-head"><span>Venue snapshots</span><span>queue / latency</span></div>{venueQuotes.map(([venue,bid,ask,latency,queue])=><div className={'venue-quote '+(venue===activePrint[4]?'active-venue':'')} key={venue}><span className="venue-name"><i/>{venue}</span><span className="venue-bid">{bid}</span><span className="venue-ask">{ask}</span><span className="venue-queue">{queue}</span><span className="venue-latency">{latency}</span></div>)}{activeVenueProfile && <div className="venue-insight"><div><span>Active venue</span><strong>{activeVenueProfile.venue} · {activeVenueProfile.queue}% queue</strong></div><span>{activeVenueProfile.latency.toFixed(1)}ms observed latency</span></div>}</div></section></div>
        <div className="metrics-row"><Metric label="Arrival mid" value="$182.21" note="09:36:00.000 ET"/><Metric label="Quoted spread" value="2.0¢" note="1.10 bps · inside"/><Metric label="Book imbalance" value="+18.4%" note="Bid-side pressure" tone="good"/><Metric label="Realized volatility" value="12.8%" note="5 min annualized" tone="warn"/></div>
        <div className="lower-grid"><section className="panel tape-table-panel"><div className="panel-header compact"><div><div className="section-label"><TerminalSquare size={14}/> Event stream</div><h2>Recent prints <span className="muted-title">· {visiblePrints.length} shown</span></h2></div><div className="stream-filters segmented">{['All','Buys','Sells'].map((item)=><button key={item} className={printFilter===item?'selected':''} onClick={()=>setPrintFilter(item as 'All'|'Buys'|'Sells')}>{item}</button>)}</div></div><div className="table-wrap"><table><thead><tr><th>Time</th><th>Side</th><th>Price</th><th>Size</th><th>Venue</th></tr></thead><tbody>{visiblePrints.map(([time,side,price,size,venue])=><tr className={time === activePrint[0] ? 'active-print' : ''} key={time+price}><td className="mono"><button className="print-select" onClick={() => selectPrint(time, price)}>{time}</button></td><td><span className={'side-pill '+side}>{side==='buy'?<ArrowUpRight size={12}/>:<ArrowDownRight size={12}/>} {side}</span></td><td className="mono">{price}</td><td className="mono">{size}</td><td><span className="venue-tag">{venue}</span></td></tr>)}</tbody></table></div></section>
          <section className="panel order-panel"><div className="panel-header compact"><div><div className="section-label"><Target size={14}/> Parent order</div><h2>Simulate an execution</h2></div><span className="order-id">PF-0042</span></div><div className="order-fields"><label>Instrument<input value="NVDA · NASDAQ" readOnly/></label><label>Side<select value={side} onChange={e=>setSide(e.target.value as 'Buy'|'Sell')}><option>Buy</option><option>Sell</option></select></label><label>Quantity<input type="number" value={quantity} onChange={e=>setQuantity(Number(e.target.value)||0)} min="100" step="100"/></label><label>Horizon<select value={horizon} onChange={e=>setHorizon(Number(e.target.value))}><option value="5">5 minutes</option><option value="15">15 minutes</option><option value="30">30 minutes</option></select></label><label>Benchmark<select value={benchmark} onChange={e=>setBenchmark(e.target.value as 'Arrival'|'VWAP'|'Close')}><option value="Arrival">Arrival price</option><option value="VWAP">Session VWAP</option><option value="Close">Close</option></select></label><label>POV cap<select value={participation} onChange={e=>setParticipation(Number(e.target.value))}><option value={5}>5% ADV</option><option value={10}>10% ADV</option><option value={20}>20% ADV</option></select></label><label>Route<select value={routePolicy} onChange={e=>setRoutePolicy(e.target.value as 'Balanced'|'Queue-aware'|'Latency-aware')}><option>Balanced</option><option>Queue-aware</option><option>Latency-aware</option></select></label><label>Spread limit<select value={maxSpread} onChange={e=>setMaxSpread(Number(e.target.value))}><option value={2}>2.0¢</option><option value={3}>3.0¢</option><option value={5}>5.0¢</option></select></label></div><div className="strategy-toggle"><span>Schedule</span><div className="strategy-buttons"><button className={mode==='TWAP'?'selected':''} onClick={()=>setMode('TWAP')}>TWAP <small>even time</small></button><button className={mode==='VWAP'?'selected':''} onClick={()=>setMode('VWAP')}>VWAP <small>volume-aware</small></button><button className={mode==='POV'?'selected':''} onClick={()=>setMode('POV')}>POV <small>participation cap</small></button></div></div><button className="simulate-button" onClick={recordRun} disabled={quantity < 100} aria-keyshortcuts="Meta+Enter Control+Enter"><Zap size={15} fill="currentColor"/> Run paper simulation <span>⌘ / Ctrl ↵</span></button><div className="simulation-meta"><output className="simulation-status" aria-live="polite"><i/> {lastRunNotice}</output><button className="text-button summary-button" onClick={copySummary}><Clipboard size={13}/> {copyState}</button></div><div className="sim-result"><div><span>Projected slippage</span><strong>{result.slippage} bps</strong></div><div><span>Expected fill</span><strong>{result.fill}%</strong></div><div><span>Est. impact</span><strong>{'$'+result.cost}</strong></div></div></section></div>
        <section className="panel schedule-panel"><div className="panel-header compact"><div><div className="section-label"><Gauge size={14}/> Child order schedule</div><h2>{mode} slices <span className="muted-title">· run {String(run).padStart(2,'0')}</span></h2></div><div className="schedule-summary">{mode === 'POV' ? <span>{participation}% cap</span> : <span>{scheduleSlices.length} slices</span>}<span>{Math.round(quantity / scheduleSlices.length).toLocaleString()} avg shares</span><span>{horizon} min horizon</span><span className="positive">Paper result ready</span></div></div><div className="schedule-track"><div className="track-line"/><div className="slice-row">{scheduleSlices.map((slice,index)=><div className={'slice '+(slice.filled?'filled':'')} key={slice.time}><div className="slice-dot"><span>{slice.filled?'✓':index+1}</span></div><div className="slice-time">{slice.time}</div><div className="slice-qty">{slice.filled ? slice.quantity.toLocaleString() : '—'}</div><div className={'slice-state '+(slice.filled?'done':'')}>{slice.filled?'filled':'queued'}</div></div>)}</div></div></section>
                <section className="panel guardrail-panel"><div className="panel-header compact"><div><div className="section-label"><ShieldCheck size={14}/> Pre-trade checks</div><h2>Route with the guardrails visible</h2></div><span className="ledger-count">{result.checks.filter((item) => item.value === 'PASS' || item.value === 'COVERED' || item.value === 'BALANCED' || item.value === 'QUEUE-AWARE' || item.value === 'LATENCY-AWARE').length}/3 clear</span></div><div className="guardrail-grid">{result.checks.map((item) => <div className={'guardrail-card '+item.tone} key={item.label}><div className="guardrail-top"><strong>{item.label}</strong><span>{item.value}</span></div><div className="guardrail-detail">{item.detail}</div></div>)}</div></section><section id="reports" className="panel attribution-panel"><div className="panel-header compact"><div><div className="section-label"><Activity size={14}/> Execution report</div><h2>Where the cost comes from</h2></div><span className="report-badge">{benchmark.toUpperCase()} BENCHMARK <span>· {side} / {mode}</span></span></div><div className="attribution-grid"><div className="attribution-chart"><div className="attribution-total"><span>Projected slippage</span><strong>{result.slippage} <small>bps</small></strong></div><div className="stacked-bar">{result.breakdown.map((item)=><div key={item.label} className={'stack-segment '+item.tone} style={{width:(Number(item.value)/Number(result.slippage)*100)+'%'}} title={item.label+' '+item.value+' bps'}/>)}</div><div className="attribution-legend">{result.breakdown.map((item)=><span key={item.label}><i className={item.tone}/>{item.label}<b>{item.value} bps</b></span>)}</div></div><div className="venue-mix"><div className="mix-heading"><span>Expected venue mix · {calibrated ? 'Adaptive calibration' : routePolicy}</span><span>Fill {result.fill}%</span></div>{activeVenueMix.map(([venue,share,tone])=><div className="mix-row" key={venue}><span className="mix-name"><i className={tone}/>{venue}</span><div className="mix-track"><span className={tone} style={{width:share}}/></div><b>{share}</b></div>)}</div><div className="report-note"><Zap size={15}/><div><strong>{side} {mode} is {mode === 'TWAP' ? 'time-even' : mode === 'VWAP' ? 'volume-aware' : 'participation-capped'} against {benchmark.toLowerCase()}.</strong><span>Change quantity or horizon to see the simulated attribution update.</span></div></div></div></section>
                <section className="panel benchmark-panel"><div className="panel-header compact"><div><div className="section-label"><BarChart3 size={14}/> Benchmark attribution</div><h2>Same schedule, different reference</h2></div><span className="ledger-count">{side} · {mode} · {quantity.toLocaleString()} shares</span></div><div className="benchmark-grid">{result.benchmarkMarks.map((item) => <div className={'benchmark-card '+(item.label === (benchmark === 'VWAP' ? 'Session VWAP' : benchmark) ? 'active-benchmark' : '')} key={item.label}><div className="benchmark-top"><strong>{item.label}</strong>{item.label === (benchmark === 'VWAP' ? 'Session VWAP' : benchmark) && <span>SELECTED</span>}</div><div className="benchmark-value">{item.value}<small>bps</small></div><div className="benchmark-copy">Modeled slippage against this reference</div></div>)}</div><div className="benchmark-note"><span>↗</span> Benchmark choice changes the interpretation of the same paper fill; arrival remains the neutral reference.</div></section><section className="panel compare-panel"><div className="panel-header compact"><div><div className="section-label"><Target size={14}/> Strategy compare</div><h2>TWAP vs VWAP vs POV</h2></div><span className="ledger-count">{side} · {benchmark} benchmark</span></div><div className="compare-grid">{result.comparison.map((item) => <div className={'compare-card '+(item.strategy===mode?'active-compare':'')} key={item.strategy}><div className="compare-top"><strong>{item.strategy}</strong>{item.strategy===mode && <span>ACTIVE</span>}</div><div className="compare-value">{item.value}<small>bps</small></div><div className="compare-copy">{item.strategy === 'TWAP' ? 'Even time slices' : item.strategy === 'VWAP' ? 'Volume-aware slices' : 'Participation capped'}</div></div>)}</div><div className="compare-delta"><span>Simulated edge</span><strong>{(Number(result.comparison[0].value)-Number(result.comparison[1].value)).toFixed(1)} bps</strong><small>{Number(result.comparison[1].value) < Number(result.comparison[0].value) ? 'VWAP is lighter on this fixture' : 'TWAP is lighter on this fixture'}</small></div></section>
        <section className="panel sensitivity-panel"><div className="panel-header compact"><div><div className="section-label"><Activity size={14}/> Size sensitivity</div><h2>Slippage by order size</h2></div><span className="ledger-count">{benchmark} benchmark · {mode}</span></div><div className="sensitivity-grid">{result.sweep.map((item) => <div className="sensitivity-card" key={item.size}><div className="sensitivity-label">{item.size >= 1000 ? (item.size / 1000) + 'k' : item.size} shares</div><div className="sensitivity-bar"><span style={{width: Math.min(100, Number(item.value) / 12 * 100) + '%'}}/></div><div className="sensitivity-value">{item.value}<small>bps</small></div></div>)}</div><div className="sensitivity-note"><span>↗</span> Larger clips spend more of the visible book before the schedule can adapt.</div></section>
        <section id="setup" className="panel calibration-panel"><div className="panel-header compact"><div><div className="section-label"><Gauge size={14}/> Adaptive venue weights</div><h2>Calibrate against the visible book</h2></div><button className="run-button" onClick={refreshCalibration}><Sparkles size={13}/> {calibrated ? 'Refresh snapshot' : 'Recalibrate weights'}</button>{calibrated && <button className="text-button" onClick={() => setCalibrated(false)}>Use route policy</button>}<button className="text-button" onClick={resetSession}>Reset session</button></div><div className="calibration-grid">{venueCalibration.map((item) => <div className={'calibration-card '+(calibrated ? 'calibrated' : '')} key={item.venue}><div className="calibration-top"><strong>{item.venue}</strong><span>{calibrated ? item.weight + '%' : '—'}</span></div><div className="calibration-bar"><span style={{width: calibrated ? item.weight + '%' : '0%'}}/></div><div className="calibration-stats"><span>Queue {item.queue}%</span><span>{item.latency.toFixed(1)}ms</span></div><p>{calibrated ? 'Adaptive weight from queue / latency' : 'Ready for calibration'}</p></div>)}</div><div className="calibration-note"><Sparkles size={14}/><span>{calibrated ? 'Weights favor displayed queue quality while penalizing latency.' : 'Recalibration uses the latest visible queue and latency snapshot.'} {calibrated && <>Snapshot {replayIndex + 1}/6 · {activePrint[0]}.000 ET</>}</span></div></section>        <section className="panel ledger-panel"><div className="panel-header compact"><div><div className="section-label"><TerminalSquare size={14}/> Experiment ledger</div><h2>Recent paper runs</h2></div><div className="ledger-actions"><span className="ledger-count">{history.length}/3 pinned</span>{history.length > 0 && <><button className="text-button" onClick={exportLedger}><Download size={13}/> {exportState}</button><button className="text-button" onClick={clearLedger}>Clear ledger</button></>}<button className="text-button" onClick={exportSession}><Download size={13}/> {jsonExportState}</button><label className="text-button session-import-button" htmlFor="session-import">Import JSON</label><input id="session-import" className="session-file-input" type="file" accept="application/json,.json" onChange={importSession}/></div></div>{history.length === 0 ? <div className="ledger-empty"><span>⌁</span><div><strong>No runs pinned yet</strong><p>Run a paper simulation to keep its result here for comparison.</p></div></div> : <div className="ledger-list">{history.map((item) => <div className={'ledger-row '+(loadedRunId === item.id ? 'loaded' : '')} key={item.id}><span className="ledger-id">#{String(item.id).padStart(2,'0')}</span><span className="ledger-strategy"><b>{item.side} {item.strategy}</b><small>{item.benchmark} · {item.quantity?.toLocaleString() ?? '—'} shares · {item.route ?? 'Balanced'} · {item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'time unavailable'}</small></span><span className="ledger-stat"><small>Slippage</small><b>{item.slippage} bps</b></span><span className="ledger-stat"><small>Fill</small><b className="positive">{item.fill}%</b></span><span className={'ledger-state '+(loadedRunId === item.id ? 'loaded-state' : '')}>{loadedRunId === item.id ? 'LOADED' : 'PAPER'}</span><button className="text-button ledger-load" onClick={() => loadLedgerItem(item)}>Load</button></div>)} </div>}{loadedRun && <div className="ledger-baseline"><div><span>Loaded baseline</span><strong>#{String(loadedRun.id).padStart(2, '0')} · {loadedRun.slippage} bps</strong></div><div><span>Current configuration</span><strong>{result.slippage} bps</strong></div><b className={Number(baselineDelta) <= 0 ? 'positive' : 'baseline-worse'}>{Number(baselineDelta) > 0 ? '+' : ''}{baselineDelta} bps</b><button className="text-button" onClick={() => setLoadedRunId(null)}>Clear baseline</button></div>}</section>
        <footer className="roadmap-footer"><div><ShieldCheck size={14}/><strong>Paper/simulation only</strong><span>· No broker connection or live routing</span></div><div>Phase 2 foundation <span className="footer-dot"/> Next: queue modeling, richer impact</div></footer>
      </div>
    </section>
  </main>;
}
