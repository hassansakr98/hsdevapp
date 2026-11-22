"use client";

import { useState } from "react";
import type { Project } from "@/lib/types";
import { cx } from "../ui/kit";
import { FilterBar, useFilters } from "./FilterBar";
import {
  ActivityTrendEV, ActivityTrendPct, CostVarianceBreakdown, CostVarianceTrend, DelayTrend,
  EarnedValueAnalysis, PlannedActualBars, ProgressCurve, ProgressMatrix,
} from "./Pages";
import type { PageProps } from "./ui";

const VIEWS: { key: string; label: string; hint: string; render: (p: PageProps) => React.ReactNode }[] = [
  { key: "evm", label: "القيمة المكتسبة", hint: "كل مؤشرات EVM مع معادلاتها", render: (p) => <EarnedValueAnalysis {...p} /> },
  { key: "curve-cost", label: "منحنى التكلفة", hint: "S-Curve تراكمي وشهري بالتكلفة", render: (p) => <ProgressCurve {...p} metric="cost" /> },
  { key: "curve-mh", label: "منحنى الساعات", hint: "S-Curve بساعات العمل", render: (p) => <ProgressCurve {...p} metric="mh" /> },
  { key: "matrix", label: "مصفوفة التقدم", hint: "Zone × Floor أو أي تجميع", render: (p) => <ProgressMatrix {...p} /> },
  { key: "bars", label: "مخطط مقابل فعلي", hint: "مقارنة حسب أي تجميع", render: (p) => <PlannedActualBars {...p} /> },
  { key: "trend-pct", label: "تريند الإنجاز", hint: "نسب الإنجاز عبر التحديثات", render: (p) => <ActivityTrendPct {...p} /> },
  { key: "trend-ev", label: "تريند PV/EV/AC", hint: "القيم عبر التحديثات", render: (p) => <ActivityTrendEV {...p} /> },
  { key: "cv-trend", label: "تريند الانحرافات", hint: "CV وSV وCPI وSPI", render: (p) => <CostVarianceTrend {...p} /> },
  { key: "delay", label: "تريند التأخير", hint: "Earned Schedule بالأيام", render: (p) => <DelayTrend {...p} /> },
  { key: "cv-breakdown", label: "تفصيل انحراف التكلفة", hint: "CV لكل مجموعة", render: (p) => <CostVarianceBreakdown {...p} /> },
];

export default function Analysis({ project }: { project: Project }) {
  const { f, setF, acts } = useFilters(project);
  const [view, setView] = useState(VIEWS[0].key);
  const v = VIEWS.find((x) => x.key === view)!;

  return (
    <>
      <FilterBar project={project} f={f} setF={setF} />
      <div className="mb-5 flex flex-wrap gap-2">
        {VIEWS.map((x) => (
          <button
            key={x.key}
            onClick={() => setView(x.key)}
            title={x.hint}
            className={cx(
              "rounded-full border px-3.5 py-1.5 text-sm transition",
              x.key === view ? "border-brand bg-brand text-white" : "border-line bg-panel text-slate-600 hover:border-brand hover:text-brand",
            )}
          >
            {x.label}
          </button>
        ))}
      </div>
      <p className="mb-4 text-sm text-muted">{v.hint}</p>
      {acts.length === 0 ? (
        <div className="rounded-2xl border border-line bg-panel p-10 text-center text-muted">ما في أنشطة بتطابق الفلاتر</div>
      ) : (
        <div className="space-y-4" dir="ltr">{v.render({ project, acts, dataDate: f.dataDate })}</div>
      )}
    </>
  );
}
