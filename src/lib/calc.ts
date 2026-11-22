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
  let bac = 0, bacMh = 0, pv = 0, pvLate = 0, ev = 0, ac = 0, pvMh = 0, evMh = 0;
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
    evMh += a.budgetManhours * act;
  }
  const plannedPct = bac ? pv / bac : 0;
  const actualPct = bac ? ev / bac : 0;
  return {
    bac, bacMh, pv, pvLate, ev, ac, pvMh, evMh,
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

/** Planned (early) and actual S-curve points, one per month */
export function sCurve(p: Project, acts: Activity[], dataDate: string) {
  const pts: { date: string; planned: number; actual: number | null }[] = [];
  const bac = acts.reduce((s, a) => s + a.budgetCost, 0) || 1;
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
  dates.sort();
  for (const dt of dates) {
    const s = snapshot(p, acts, dt);
    pts.push({
      date: dt,
      planned: (s.pv / bac) * 100,
      actual: dt <= dataDate ? (s.ev / bac) * 100 : null,
    });
  }
  return pts;
}

/** Delay trend across recorded data dates up to the selected one */
export function delayTrend(p: Project, acts: Activity[], dataDate: string) {
  return p.dataDates
    .filter((d) => d <= dataDate)
    .map((d) => ({ date: d, delay: delayDays(p, acts, d) }));
}

/** Per-type-of-work breakdown (grouped by activity name) */
export function byWork(p: Project, acts: Activity[], date: string) {
  const groups = new Map<string, Activity[]>();
  for (const a of acts) {
    const g = groups.get(a.name) ?? [];
    g.push(a);
    groups.set(a.name, g);
  }
  return [...groups.entries()]
    .map(([name, g]) => {
      const s = snapshot(p, g, date);
      return {
        name,
        early: s.plannedPct,
        late: s.bac ? s.pvLate / s.bac : 0,
        actual: s.actualPct,
        variance: s.variancePct,
      };
    })
    .sort((a, b) => b.early - a.early);
}
