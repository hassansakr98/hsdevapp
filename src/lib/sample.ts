import { addDays, daysBetween, plannedAt } from "./calc";
import type { Activity, Project } from "./types";

/** Deterministic PRNG so sample data is stable between renders */
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

const WORKS: { name: string; category: string; type: string; offset: number; dur: number; weight: number }[] = [
  { name: "Site Work And Preparation", category: "Civil", type: "Preliminary", offset: 0, dur: 60, weight: 3 },
  { name: "Preliminaries", category: "General", type: "Preliminary", offset: 0, dur: 280, weight: 4 },
  { name: "Slab Unreinforced Concrete", category: "Civil", type: "Concrete", offset: 30, dur: 170, weight: 3 },
  { name: "Columns Steel Reinforcement", category: "Structural", type: "Steel", offset: 60, dur: 330, weight: 6 },
  { name: "Columns Reinforced Concrete", category: "Structural", type: "Concrete", offset: 75, dur: 340, weight: 7 },
  { name: "Slab Shuttering", category: "Structural", type: "Formwork", offset: 70, dur: 320, weight: 5 },
  { name: "Slab Steel Reinforcement", category: "Structural", type: "Steel", offset: 80, dur: 330, weight: 7 },
  { name: "Slab Reinforced Concrete", category: "Structural", type: "Concrete", offset: 90, dur: 330, weight: 9 },
  { name: "Block Work", category: "Architectural", type: "Masonry", offset: 250, dur: 220, weight: 6 },
  { name: "Plastering", category: "Architectural", type: "Finishes", offset: 320, dur: 200, weight: 5 },
  { name: "MEP First Fix", category: "MEP", type: "MEP", offset: 280, dur: 220, weight: 9 },
  { name: "MEP Second Fix", category: "MEP", type: "MEP", offset: 420, dur: 150, weight: 8 },
  { name: "Tiling & Flooring", category: "Architectural", type: "Finishes", offset: 430, dur: 150, weight: 6 },
  { name: "Painting", category: "Architectural", type: "Finishes", offset: 480, dur: 130, weight: 4 },
  { name: "External Works", category: "Civil", type: "Landscape", offset: 500, dur: 130, weight: 4 },
];
const ZONES = ["Zone A", "Zone B", "Zone C"];
const FLOORS = ["Basement", "Ground", "First", "Second"];

export function sampleProject(): Project {
  const r = rng(42);
  const contractStart = "2016-01-20";
  const contractFinish = "2017-11-09";
  const totalDays = daysBetween(contractStart, contractFinish);
  const scale = totalDays / 630;

  // data dates: weekly, from start up to Aug 2016
  const dataDates: string[] = [];
  for (let d = addDays(contractStart, 7); d <= "2016-08-07"; d = addDays(d, 7)) dataDates.push(d);
  if (!dataDates.includes("2016-08-07")) dataDates.push("2016-08-07");

  const activities: Activity[] = [];
  let id = 1;
  for (const w of WORKS) {
    for (const zone of ZONES) {
      for (const floor of FLOORS) {
        const shift = FLOORS.indexOf(floor) * 12 + ZONES.indexOf(zone) * 6;
        const es = addDays(contractStart, Math.round((w.offset + (w.type === "Preliminary" ? 0 : shift)) * scale));
        const dur = Math.max(20, Math.round((w.dur - (w.type === "Preliminary" ? 0 : shift)) * scale));
        let ef = addDays(es, dur);
        if (ef > contractFinish) ef = contractFinish;
        const float = Math.round(r() * 25);
        const ls = addDays(es, float);
        let lf = addDays(ef, float);
        if (lf > contractFinish) lf = contractFinish;
        const budgetCost = Math.round(w.weight * 120_000 * (0.7 + r() * 0.6));
        const budgetManhours = Math.round(budgetCost / (40 + r() * 30));
        // productivity factor: most behind, a few on track
        const perf = w.name === "Site Work And Preparation" ? 1 : 0.72 + r() * 0.3;
        const costFactor = 0.97 + r() * 0.1;
        const actualProgress: Record<string, number> = {};
        const actualCost: Record<string, number> = {};
        for (const d of dataDates) {
          // progress slips more as time passes
          const p = plannedAt(es, ef, d);
          const t = Math.min(1, daysBetween(contractStart, d) / 200);
          const a = Math.min(1, p * (1 - (1 - perf) * t));
          actualProgress[d] = Math.round(a * 10000) / 10000;
          actualCost[d] = Math.round(a * budgetCost * costFactor);
        }
        activities.push({
          id: `A${id++}`,
          name: w.name,
          zone,
          floor,
          category: w.category,
          type: w.type,
          budgetCost,
          budgetManhours,
          earlyStart: es,
          earlyFinish: ef,
          lateStart: ls,
          lateFinish: lf,
          actualProgress,
          actualCost,
        });
      }
    }
  }
  return {
    id: "demo",
    name: "Full Project Analytics",
    contractStart,
    contractFinish,
    dataDates,
    activities,
  };
}
