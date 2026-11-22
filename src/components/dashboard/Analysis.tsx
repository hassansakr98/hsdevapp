"use client";

import { useState } from "react";
import type { Project } from "@/lib/types";
import type { Tr } from "@/lib/i18n";
import { useTr } from "../LangProvider";
import { cx } from "../ui/kit";
import { FilterBar, useFilters } from "./FilterBar";
import {
  ActivityTrendEV, ActivityTrendPct, CostVarianceBreakdown, CostVarianceTrend, DelayTrend,
  EarnedValueAnalysis, PlannedActualBars, ProgressCurve, ProgressMatrix,
} from "./Pages";
import type { PageProps } from "./ui";

const views = (tr: Tr): { key: string; label: string; hint: string; render: (p: PageProps) => React.ReactNode }[] => [
  { key: "evm", label: tr("القيمة المكتسبة", "Earned value"), hint: tr("كل مؤشرات EVM مع معادلاتها", "All EVM indicators with formulas"), render: (p) => <EarnedValueAnalysis {...p} /> },
  { key: "curve-cost", label: tr("منحنى التكلفة", "Cost curve"), hint: tr("S-Curve تراكمي وشهري بالتكلفة", "Cumulative and monthly S-curve by cost"), render: (p) => <ProgressCurve {...p} metric="cost" /> },
  { key: "curve-mh", label: tr("منحنى الساعات", "Manhour curve"), hint: tr("S-Curve بساعات العمل", "S-curve by manhours"), render: (p) => <ProgressCurve {...p} metric="mh" /> },
  { key: "matrix", label: tr("مصفوفة التقدم", "Progress matrix"), hint: tr("Zone × Floor أو أي تجميع", "Zone × Floor or any grouping"), render: (p) => <ProgressMatrix {...p} /> },
  { key: "bars", label: tr("مخطط مقابل فعلي", "Planned vs actual"), hint: tr("مقارنة حسب أي تجميع", "Comparison by any grouping"), render: (p) => <PlannedActualBars {...p} /> },
  { key: "trend-pct", label: tr("تريند الإنجاز", "Progress trend"), hint: tr("نسب الإنجاز عبر التحديثات", "Progress % across updates"), render: (p) => <ActivityTrendPct {...p} /> },
  { key: "trend-ev", label: tr("تريند PV/EV/AC", "PV/EV/AC trend"), hint: tr("القيم عبر التحديثات", "Values across updates"), render: (p) => <ActivityTrendEV {...p} /> },
  { key: "cv-trend", label: tr("تريند الانحرافات", "Variance trend"), hint: tr("CV وSV وCPI وSPI", "CV, SV, CPI and SPI"), render: (p) => <CostVarianceTrend {...p} /> },
  { key: "delay", label: tr("تريند التأخير", "Delay trend"), hint: tr("Earned Schedule بالأيام", "Earned Schedule in days"), render: (p) => <DelayTrend {...p} /> },
  { key: "cv-breakdown", label: tr("تفصيل انحراف التكلفة", "Cost variance breakdown"), hint: tr("CV لكل مجموعة", "CV per group"), render: (p) => <CostVarianceBreakdown {...p} /> },
];

export default function Analysis({ project }: { project: Project }) {
  const tr = useTr();
  const VIEWS = views(tr);
  const { f, setF, acts } = useFilters(project);
  const [view, setView] = useState("evm");
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
        <div className="rounded-2xl border border-line bg-panel p-10 text-center text-muted">{tr("ما في أنشطة بتطابق الفلاتر", "No activities match these filters")}</div>
      ) : (
        <div className="space-y-4">{v.render({ project, acts, dataDate: f.dataDate })}</div>
      )}
    </>
  );
}
