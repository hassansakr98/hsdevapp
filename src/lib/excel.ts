import readXlsxFile from "read-excel-file/node";
import writeXlsxFile from "write-excel-file/node";
import type { SheetData } from "write-excel-file/node";
import type { Activity } from "./types";

export const ACTIVITY_COLUMNS = [
  "Activity ID", "Activity Name", "Zone", "Floor", "Category", "Type",
  "Budget Cost", "Budget Manhours", "Early Start", "Early Finish", "Late Start", "Late Finish",
] as const;
export const PROGRESS_COLUMNS = ["Activity ID", "Data Date", "Actual %", "Actual Cost"] as const;

const head = (cols: readonly string[]) =>
  cols.map((c) => ({ value: c, fontWeight: "bold" as const, backgroundColor: "#2EC4B6" }));

/** Build the import template, optionally pre-filled with example rows */
export async function buildTemplate(example?: Activity[], dataDates?: string[]): Promise<Buffer> {
  const acts: SheetData = [head(ACTIVITY_COLUMNS)];
  const prog: SheetData = [head(PROGRESS_COLUMNS)];
  const d = (s: string) => ({ value: new Date(s + "T00:00:00Z"), type: Date, format: "yyyy-mm-dd" });
  for (const a of example ?? []) {
    acts.push([a.id, a.name, a.zone, a.floor, a.category, a.type, a.budgetCost, a.budgetManhours,
      d(a.earlyStart), d(a.earlyFinish), d(a.lateStart), d(a.lateFinish)]);
    for (const dt of dataDates ?? []) {
      if (a.actualProgress[dt] === undefined) continue;
      prog.push([a.id, d(dt), { value: a.actualProgress[dt] * 100, format: "0.00" }, a.actualCost[dt] ?? 0]);
    }
  }
  const help: SheetData = [
    [{ value: "How to fill this template", fontWeight: "bold" }],
    ["Activities sheet: one row per activity. Dates as real Excel dates (or yyyy-mm-dd). Budget Cost and Budget Manhours are numbers."],
    ["Late Start / Late Finish: from your schedule (Primavera / MS Project). If unknown, copy the Early dates."],
    ["Progress sheet: one row per activity per data date. Actual % is cumulative 0–100. Actual Cost is cumulative cost to date."],
    ["Activity Name groups activities into 'Type of Work' on the dashboard (e.g. 'Slab Reinforced Concrete' repeated per zone/floor)."],
  ];
  const widths = (n: number) => Array.from({ length: n }, () => ({ width: 18 }));
  return writeXlsxFile([
    { sheet: "Activities", data: acts, columns: widths(ACTIVITY_COLUMNS.length), stickyRowsCount: 1 },
    { sheet: "Progress", data: prog, columns: widths(PROGRESS_COLUMNS.length), stickyRowsCount: 1 },
    { sheet: "Instructions", data: help, columns: [{ width: 120 }] },
  ]).toBuffer();
}

type Cell = string | number | boolean | Date | null;

function toIso(v: Cell): string | null {
  if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  if (typeof v === "string") {
    const s = v.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/); // dd/mm/yyyy
    if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  if (typeof v === "number" && v > 20000 && v < 80000) {
    // Excel serial date
    return new Date(Date.UTC(1899, 11, 30) + v * 86_400_000).toISOString().slice(0, 10);
  }
  return null;
}
function toNum(v: Cell): number | null {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v.replace(/[,%\s]/g, ""));
    return isNaN(n) ? null : n;
  }
  return null;
}
const str = (v: Cell) => (v === null || v === undefined ? "" : v instanceof Date ? v.toISOString().slice(0, 10) : String(v).trim());

export interface ImportResult {
  activities: Activity[];
  dataDates: string[];
  minDate: string;
  maxDate: string;
  errors: string[];
}

/** Parse an uploaded workbook. Collects row-level errors instead of throwing. */
export async function parseWorkbook(buf: Buffer): Promise<ImportResult> {
  const errors: string[] = [];
  let sheets: { sheet: string; data: Cell[][] }[];
  try {
    sheets = (await readXlsxFile(buf)) as { sheet: string; data: Cell[][] }[];
  } catch {
    return { activities: [], dataDates: [], minDate: "", maxDate: "", errors: ["الملف ليس ملف Excel صالح (.xlsx)"] };
  }
  const find = (name: string) => sheets.find((s) => s.sheet.trim().toLowerCase() === name.toLowerCase());
  const actSheet = find("Activities");
  const progSheet = find("Progress");
  if (!actSheet) errors.push('ما لقيت ورقة باسم "Activities"');
  if (!progSheet) errors.push('ما لقيت ورقة باسم "Progress"');
  if (!actSheet || !progSheet) return { activities: [], dataDates: [], minDate: "", maxDate: "", errors };

  const index = (header: Cell[], cols: readonly string[], sheet: string) => {
    const h = header.map((c) => str(c).toLowerCase());
    const idx: Record<string, number> = {};
    for (const c of cols) {
      const i = h.indexOf(c.toLowerCase());
      if (i < 0) errors.push(`ورقة ${sheet}: العمود "${c}" مش موجود`);
      idx[c] = i;
    }
    return idx;
  };

  const [aHead, ...aRows] = actSheet.data;
  const [pHead, ...pRows] = progSheet.data;
  const ai = index(aHead ?? [], ACTIVITY_COLUMNS, "Activities");
  const pi = index(pHead ?? [], PROGRESS_COLUMNS, "Progress");
  if (errors.length) return { activities: [], dataDates: [], minDate: "", maxDate: "", errors };

  const map = new Map<string, Activity>();
  let minDate = "9999-12-31", maxDate = "0000-01-01";
  aRows.forEach((r, k) => {
    const row = k + 2;
    if (r.every((c) => c === null || str(c) === "")) return;
    const g = (c: (typeof ACTIVITY_COLUMNS)[number]) => r[ai[c]] ?? null;
    const id = str(g("Activity ID"));
    const es = toIso(g("Early Start")), ef = toIso(g("Early Finish"));
    const ls = toIso(g("Late Start")) ?? es, lf = toIso(g("Late Finish")) ?? ef;
    const cost = toNum(g("Budget Cost")), mh = toNum(g("Budget Manhours")) ?? 0;
    if (!id) return errors.push(`Activities صف ${row}: Activity ID فاضي`);
    if (map.has(id)) return errors.push(`Activities صف ${row}: Activity ID "${id}" مكرر`);
    if (!es || !ef) return errors.push(`Activities صف ${row}: تاريخ Early Start/Finish غير صالح`);
    if (ef < es) return errors.push(`Activities صف ${row}: Early Finish قبل Early Start`);
    if (cost === null || cost < 0) return errors.push(`Activities صف ${row}: Budget Cost لازم يكون رقم`);
    minDate = [minDate, es, ls!].sort()[0];
    maxDate = [maxDate, ef, lf!].sort()[2];
    map.set(id, {
      id, name: str(g("Activity Name")) || id,
      zone: str(g("Zone")) || "—", floor: str(g("Floor")) || "—",
      category: str(g("Category")) || "—", type: str(g("Type")) || "—",
      budgetCost: cost, budgetManhours: mh,
      earlyStart: es, earlyFinish: ef, lateStart: ls!, lateFinish: lf!,
      actualProgress: {}, actualCost: {},
    });
  });

  const dates = new Set<string>();
  pRows.forEach((r, k) => {
    const row = k + 2;
    if (r.every((c) => c === null || str(c) === "")) return;
    const g = (c: (typeof PROGRESS_COLUMNS)[number]) => r[pi[c]] ?? null;
    const id = str(g("Activity ID"));
    const a = map.get(id);
    if (!a) return errors.push(`Progress صف ${row}: Activity ID "${id}" مش موجود بورقة Activities`);
    const d = toIso(g("Data Date"));
    if (!d) return errors.push(`Progress صف ${row}: Data Date غير صالح`);
    // Actual % is always 0–100 (cumulative)
    const n = toNum(g("Actual %"));
    if (n === null) return errors.push(`Progress صف ${row}: Actual % لازم يكون رقم`);
    if (n < 0 || n > 100.01) return errors.push(`Progress صف ${row}: Actual % لازم يكون بين 0 و 100`);
    const pct = n / 100;
    a.actualProgress[d] = Math.min(1, pct);
    a.actualCost[d] = toNum(g("Actual Cost")) ?? 0;
    dates.add(d);
  });

  if (map.size === 0) errors.push("ورقة Activities فاضية");
  return {
    activities: [...map.values()],
    dataDates: [...dates].sort(),
    minDate, maxDate, errors,
  };
}
