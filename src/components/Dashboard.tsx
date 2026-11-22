"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { filterActivities } from "@/lib/calc";
import type { Filters, Project } from "@/lib/types";
import { logout } from "@/lib/auth";
import { removeProject } from "@/lib/project-actions";
import { Select, type PageProps } from "./dashboard/ui";
import Overview from "./dashboard/Overview";
import {
  ActivityTrendEV, ActivityTrendPct, CostVarianceBreakdown, CostVarianceTrend, DelayTrend,
  EarnedValueAnalysis, PlannedActualBars, ProgressCurve, ProgressMatrix,
} from "./dashboard/Pages";

const PAGES: [string, (p: PageProps) => React.ReactNode][] = [
  ["Dashboard", (p) => <Overview {...p} />],
  ["Progress Curve - Cost", (p) => <ProgressCurve {...p} metric="cost" />],
  ["Progress Curve - Manhour", (p) => <ProgressCurve {...p} metric="mh" />],
  ["Progress Matrix", (p) => <ProgressMatrix {...p} />],
  ["Planned vs Actual Bars", (p) => <PlannedActualBars {...p} />],
  ["Activity Progress Trend %", (p) => <ActivityTrendPct {...p} />],
  ["Activity Progress Trend EV", (p) => <ActivityTrendEV {...p} />],
  ["Cost Variance Trend", (p) => <CostVarianceTrend {...p} />],
  ["Delay / Ahead Trend", (p) => <DelayTrend {...p} />],
  ["Cost Variance Breakdown", (p) => <CostVarianceBreakdown {...p} />],
  ["Earned Value Analysis", (p) => <EarnedValueAnalysis {...p} />],
];

export default function Dashboard({
  project, user, canDelete = false,
}: { project: Project; user: { name: string; company: string }; canDelete?: boolean }) {
  const uniq = (k: "zone" | "floor" | "category" | "type") =>
    ["All", ...[...new Set(project.activities.map((a) => a[k]))].sort()];

  const [page, setPage] = useState(0);
  const [f, setF] = useState<Filters>({
    zone: "All", floor: "All", category: "All", type: "All",
    dataDate: project.dataDates[project.dataDates.length - 1] ?? project.contractStart,
  });
  const set = (k: keyof Filters) => (v: string) => setF((s) => ({ ...s, [k]: v }));
  const acts = useMemo(() => filterActivities(project, f), [project, f]);
  const [title, render] = PAGES[page];

  return (
    <div className="flex min-h-screen bg-[#1f2230] text-white">
      <aside className="flex w-52 shrink-0 flex-col gap-3 border-r-4 border-[#f4b942] p-4">
        <Link href="/" className="mb-2 rounded bg-white py-3 text-center text-lg font-bold text-[#1f2a5a]">hsdevapp</Link>
        <Link href="/" className="text-center text-sm text-[#2ec4b6] hover:underline">→ كل المشاريع</Link>
        {PAGES.map(([n], i) => (
          <button
            key={n}
            onClick={() => setPage(i)}
            className={`rounded-lg px-2 py-2.5 text-sm ${i === page ? "bg-[#f26d6d] text-white" : "bg-[#2ec4b6] text-[#12303a] hover:brightness-110"}`}
          >
            {n}
          </button>
        ))}
        <a
          href={`/projects/${project.id}/report?${new URLSearchParams({ ...f, print: "1" })}`}
          target="_blank"
          rel="noopener"
          className="mt-2 rounded-lg bg-[#f4b942] px-2 py-2.5 text-center text-sm font-semibold text-[#12303a] hover:brightness-110"
        >
          ⬇ Export PDF
        </a>
        <div className="mt-auto border-t border-[#454a5c] pt-3 text-sm">
          <div className="font-medium">{user.name}</div>
          <div className="text-xs text-gray-400">{user.company}</div>
          {canDelete && (
            <form
              action={removeProject}
              onSubmit={(e) => {
                if (!confirm(`حذف المشروع "${project.name}" نهائياً؟ ما بينفع نرجّعه.`)) e.preventDefault();
              }}
            >
              <input type="hidden" name="id" value={project.id} />
              <button className="mt-2 w-full rounded-lg border border-gray-500 py-1.5 text-gray-300 hover:border-[#f26d6d] hover:text-[#f26d6d]">
                حذف المشروع
              </button>
            </form>
          )}
          <form action={logout}>
            <button className="mt-2 w-full rounded-lg border border-[#f26d6d] py-1.5 text-[#f26d6d] hover:bg-[#f26d6d] hover:text-white">
              تسجيل خروج
            </button>
          </form>
        </div>
      </aside>

      <main className="min-w-0 flex-1 space-y-3 p-4">
        <header className="flex flex-wrap items-center gap-3">
          <div className="mr-auto">
            <h1 className="text-2xl font-semibold">{project.name}</h1>
            {page > 0 && <div className="text-sm text-[#f4b942]">{title}</div>}
          </div>
          <Select label="Zone" value={f.zone} options={uniq("zone")} onChange={set("zone")} />
          <Select label="Floor" value={f.floor} options={uniq("floor")} onChange={set("floor")} />
          <Select label="Category" value={f.category} options={uniq("category")} onChange={set("category")} />
          <Select label="Type" value={f.type} options={uniq("type")} onChange={set("type")} />
          <Select label="Data Date" value={f.dataDate} options={project.dataDates.length ? [...project.dataDates].reverse() : [f.dataDate]} onChange={set("dataDate")} />
        </header>
        {project.dataDates.length === 0 && (
          <div className="rounded-lg bg-[#f4b942]/15 p-3 text-sm text-[#f4b942]">
            No progress data yet — the Progress sheet was empty, so actual values show as 0.
          </div>
        )}
        {acts.length === 0 ? (
          <div className="rounded-lg bg-[#2b2f3e] p-10 text-center text-gray-300">No activities match these filters.</div>
        ) : (
          render({ project, acts, dataDate: f.dataDate })
        )}
      </main>
    </div>
  );
}
