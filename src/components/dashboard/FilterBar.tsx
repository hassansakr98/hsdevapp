"use client";

import { useMemo, useState } from "react";
import { filterActivities } from "@/lib/calc";
import type { Filters, Project } from "@/lib/types";
import { useTr } from "../LangProvider";
import { cx } from "../ui/kit";


export function useFilters(project: Project) {
  const [f, setF] = useState<Filters>({
    zone: "All", floor: "All", category: "All", type: "All",
    dataDate: project.dataDates.at(-1) ?? project.contractStart,
  });
  const acts = useMemo(() => filterActivities(project, f), [project, f]);
  return { f, setF, acts };
}

export function FilterBar({ project, f, setF }: { project: Project; f: Filters; setF: (fn: (f: Filters) => Filters) => void }) {
  const tr = useTr();
  const LABELS: Record<keyof Filters, string> = {
    zone: "Zone", floor: tr("الطابق", "Floor"), category: tr("التصنيف", "Category"), type: tr("النوع", "Type"), dataDate: "Data Date",
  };
  const uniq = (k: "zone" | "floor" | "category" | "type") =>
    ["All", ...[...new Set(project.activities.map((a) => a[k]))].sort()];
  const dates = project.dataDates.length ? [...project.dataDates].reverse() : [f.dataDate];
  const active = (["zone", "floor", "category", "type"] as const).filter((k) => f[k] !== "All").length;

  const sel = (k: keyof Filters, options: string[]) => (
    <label key={k} className="flex items-center gap-2 text-xs text-muted">
      {LABELS[k]}
      <select
        value={f[k]}
        onChange={(e) => setF((s) => ({ ...s, [k]: e.target.value }))}
        className={cx(
          "rounded-lg border bg-panel px-2 py-1.5 text-sm text-ink outline-none focus:border-brand",
          f[k] !== "All" && k !== "dataDate" ? "border-brand bg-brand-soft" : "border-line",
        )}
      >
        {options.map((o) => <option key={o} value={o}>{o === "All" ? tr("الكل", "All") : o}</option>)}
      </select>
    </label>
  );

  return (
    <div className="no-print mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-panel px-4 py-3">
      {sel("dataDate", dates)}
      <span className="h-5 w-px bg-line" />
      {sel("zone", uniq("zone"))}
      {sel("floor", uniq("floor"))}
      {sel("category", uniq("category"))}
      {sel("type", uniq("type"))}
      {active > 0 && (
        <button
          onClick={() => setF((s) => ({ ...s, zone: "All", floor: "All", category: "All", type: "All" }))}
          className="text-xs font-medium text-brand hover:underline"
        >
          {tr("مسح الفلاتر", "Clear filters")} ({active})
        </button>
      )}
      <a
        href={`/report/${project.id}?${new URLSearchParams({ ...f, print: "1" })}`}
        target="_blank"
        rel="noopener"
        className="ms-auto rounded-lg border border-line px-3 py-1.5 text-xs font-medium hover:bg-canvas"
      >
        ⬇ {tr("تقرير PDF", "PDF report")}
      </a>
    </div>
  );
}
