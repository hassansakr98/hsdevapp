import type { Activity, Filters, Project } from "./types";

const DAY = 86_400_000;
export const toDate = (s: string) => new Date(s + "T00:00:00Z");
export const iso = (d: Date) => d.toISOString().slice(0, 10);
export const daysBetween = (a: string, b: string) =>
  Math.round((toDate(b).getTime() - toDate(a).getTime()) / DAY);
export const addDays = (s: string, n: number) => iso(new Date(toDate(s).getTime() + n * DAY));

/** Linear planned progress (0..1) of an activity at a date */
export function plannedAt(start: string, finish: string, date: string): number {
  const t = toDate(date).getTime();
  const s = toDate(start).getTime();
  const f = toDate(finish).getTime();
  if (t <= s) return 0;
  if (t >= f) return 1;
  return (t - s) / (f - s);
}

/** Actual progress at a date: last recorded value on or before it */
export function actualAt(a: Activity, dataDates: string[], date: string): number {
  let v = 0;
  for (const d of dataDates) {
    if (d > date) break;
    if (a.actualProgress[d] !== undefined) v = a.actualProgress[d];
  }
  return v;
}

function actualCostAt(a: Activity, dataDates: string[], date: string): number {
  let v = 0;
  for (const d of dataDates) {
    if (d > date) break;
    if (a.actualCost[d] !== undefined) v = a.actualCost[d];
  }
  return v;
}

export function filterActivities(p: Project, f: Filters): Activity[] {
  return p.activities.filter(
    (a) =>
      (f.zone === "All" || a.zone === f.zone) &&
      (f.floor === "All" || a.floor === f.floor) &&
      (f.category === "All" || a.category === f.category) &&
      (f.type === "All" || a.type === f.type),
  );
}

export interface Snapshot {
  bac: number; // budget at completion (cost)
  bacMh: number;
  pv: number; // planned value (early)
  pvLate: number;
  ev: number; // earned value
  ac: number; // actual cost
  pvMh: number;
  pvLateMh: number;
  evMh: number;
  plannedPct: number;
  actualPct: number;
  plannedPctMh: number;
  actualPctMh: number;
  spi: number;
  cpi: number;
  variancePct: number;
}

export function snapshot(p: Project, acts: Activity[], date: string): Snapshot {
  let bac = 0, bacMh = 0, pv = 0, pvLate = 0, ev = 0, ac = 0, pvMh = 0, pvLateMh = 0, evMh = 0;
  for (const a of acts) {
    const pe = plannedAt(a.earlyStart, a.earlyFinish, date);
    const pl = plannedAt(a.lateStart, a.lateFinish, date);
    const act = actualAt(a, p.dataDates, date);
    bac += a.budgetCost;
    bacMh += a.budgetManhours;
    pv += a.budgetCost * pe;
    pvLate += a.budgetCost * pl;
    ev += a.budgetCost * act;
    ac += actualCostAt(a, p.dataDates, date);
    pvMh += a.budgetManhours * pe;
    pvLateMh += a.budgetManhours * pl;
    evMh += a.budgetManhours * act;
  }
  const plannedPct = bac ? pv / bac : 0;
  const actualPct = bac ? ev / bac : 0;
  return {
    bac, bacMh, pv, pvLate, ev, ac, pvMh, pvLateMh, evMh,
    plannedPct,
    actualPct,
    plannedPctMh: bacMh ? pvMh / bacMh : 0,
    actualPctMh: bacMh ? evMh / bacMh : 0,
    spi: pv ? ev / pv : 1,
    cpi: ac ? ev / ac : 1,
    variancePct: actualPct - plannedPct,
  };
}

/**
 * Schedule delay using Earned Schedule: find the date at which planned value
 * equals the current earned value. Negative = behind schedule.
 */
export function delayDays(p: Project, acts: Activity[], date: string): number {
  const ev = snapshot(p, acts, date).ev;
  let lo = p.contractStart, hi = date;
  if (snapshot(p, acts, hi).pv <= ev) {
    // ahead (or on time): search forward
    hi = p.contractFinish;
  }
  // binary search on days
  let l = 0, h = daysBetween(lo, hi);
  while (l < h) {
    const m = Math.floor((l + h) / 2);
    if (snapshot(p, acts, addDays(lo, m)).pv < ev) l = m + 1;
    else h = m;
  }
  const es = addDays(lo, l);
  return daysBetween(date, es);
}

export type Metric = "cost" | "mh";

/**
 * Monthly S-curve: cumulative early/late planned % and actual %,
 * plus period (per-month) planned and actual % increments.
 */
export function sCurve(p: Project, acts: Activity[], dataDate: string, metric: Metric = "cost") {
  const pts: {
    date: string; planned: number; late: number; actual: number | null;
    periodPlanned: number; periodActual: number | null;
  }[] = [];
  const dates = curveDates(p, dataDate);
  let prevP = 0, prevA = 0;
  for (const dt of dates) {
    const s = snapshot(p, acts, dt);
    const total = (metric === "cost" ? s.bac : s.bacMh) || 1;
    const planned = ((metric === "cost" ? s.pv : s.pvMh) / total) * 100;
    const late = ((metric === "cost" ? s.pvLate : s.pvLateMh) / total) * 100;
    const actual = dt <= dataDate ? ((metric === "cost" ? s.ev : s.evMh) / total) * 100 : null;
    pts.push({
      date: dt, planned, late, actual,
      periodPlanned: planned - prevP,
      periodActual: actual === null ? null : actual - prevA,
    });
    prevP = planned;
    if (actual !== null) prevA = actual;
  }
  return pts;
}

function curveDates(p: Project, dataDate: string) {
  const start = toDate(p.contractStart);
  const end = toDate(p.contractFinish);
  const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  const dates = [p.contractStart];
  while (true) {
    d.setUTCMonth(d.getUTCMonth() + 1);
    if (d > end) break;
    dates.push(iso(d));
  }
  dates.push(p.contractFinish);
  if (!dates.includes(dataDate)) dates.push(dataDate);
  return [...new Set(dates)].sort();
}

/** Delay trend across recorded data dates up to the selected one */
export function delayTrend(p: Project, acts: Activity[], dataDate: string) {
  return p.dataDates
    .filter((d) => d <= dataDate)
    .map((d) => ({ date: d, delay: delayDays(p, acts, d) }));
}

/** Full EVM time series over recorded data dates (up to the selected one) */
export function evTrend(p: Project, acts: Activity[], dataDate: string) {
  return p.dataDates
    .filter((d) => d <= dataDate)
    .map((d) => {
      const s = snapshot(p, acts, d);
      return {
        date: d,
        pv: s.pv, ev: s.ev, ac: s.ac,
        sv: s.ev - s.pv, cv: s.ev - s.ac,
        spi: s.spi, cpi: s.cpi,
        plannedPct: s.plannedPct * 100,
        actualPct: s.actualPct * 100,
        plannedPctMh: s.plannedPctMh * 100,
        actualPctMh: s.actualPctMh * 100,
        delay: delayDays(p, acts, d),
      };
    });
}

export type GroupKey = "name" | "zone" | "floor" | "category" | "type";

/** Snapshot per group (type of work / zone / floor / category / type) */
export function groupBy(p: Project, acts: Activity[], date: string, key: GroupKey) {
  const groups = new Map<string, Activity[]>();
  for (const a of acts) {
    const g = groups.get(a[key]) ?? [];
    g.push(a);
    groups.set(a[key], g);
  }
  return [...groups.entries()].map(([name, g]) => {
    const s = snapshot(p, g, date);
    return { name, acts: g, s };
  });
}

/** Per-type-of-work breakdown (grouped by activity name) */
export function byWork(p: Project, acts: Activity[], date: string) {
  return groupBy(p, acts, date, "name")
    .map(({ name, s }) => ({
      name,
      early: s.plannedPct,
      late: s.bac ? s.pvLate / s.bac : 0,
      actual: s.actualPct,
      variance: s.variancePct,
    }))
    .sort((a, b) => b.early - a.early);
}

/** Two-dimensional progress matrix, e.g. zone x floor */
export function matrix(p: Project, acts: Activity[], date: string, rowKey: GroupKey, colKey: GroupKey) {
  const rows = [...new Set(acts.map((a) => a[rowKey]))].sort();
  const cols = [...new Set(acts.map((a) => a[colKey]))].sort();
  const cells = rows.map((r) =>
    cols.map((c) => {
      const g = acts.filter((a) => a[rowKey] === r && a[colKey] === c);
      return g.length ? snapshot(p, g, date) : null;
    }),
  );
  return { rows, cols, cells };
}

/** Standard earned value management indicators */
export function evm(s: Snapshot) {
  const cv = s.ev - s.ac;
  const sv = s.ev - s.pv;
  const eac = s.cpi > 0 ? s.bac / s.cpi : s.bac;
  const etc = eac - s.ac;
  const vac = s.bac - eac;
  const tcpi = s.bac - s.ac !== 0 ? (s.bac - s.ev) / (s.bac - s.ac) : 1;
  const eacCombined = s.ac + (s.bac - s.ev) / (s.cpi * s.spi || 1);
  return { cv, sv, eac, etc, vac, tcpi, eacCombined };
}
