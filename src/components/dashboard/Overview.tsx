"use client";

import Link from "next/link";
import {
  Area, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { addDays, byWork, daysBetween, delayDays, delayTrend, evm, sCurve, snapshot } from "@/lib/calc";
import type { Project } from "@/lib/types";
import { Badge, Card, Stat, btn, cx, fmtDate, money, monthLabel, pct } from "../ui/kit";
import { useTr } from "../LangProvider";
import { FilterBar, useFilters } from "./FilterBar";
import { AMBER, BAD, CORAL, GRID, TEAL, tooltipStyle } from "./ui";

const axis = { stroke: "#94a3b8", fontSize: 11 };

export default function Overview({ project }: { project: Project }) {
  const { f, setF, acts } = useFilters(project);
  const tr = useTr();

  if (project.activities.length === 0) {
    return (
      <Card>
        <div className="py-10 text-center">
          <div className="text-lg font-semibold">{tr("المشروع فاضي لسا", "The project is empty")}</div>
          <p className="mt-1 text-sm text-muted">{tr("ضيف الأنشطة يدوياً أو من ملف Excel، وبعدها سجّل أول تحديث للتقدم.", "Add activities manually or from Excel, then record the first progress update.")}</p>
          <div className="mt-4 flex justify-center gap-2">
            <Link href={`/projects/${project.id}/activities`} className={btn("primary")}>{tr("إضافة الأنشطة", "Add activities")}</Link>
          </div>
        </div>
      </Card>
    );
  }

  const d = f.dataDate;
  const s = snapshot(project, acts, d);
  const e = evm(s);
  const delay = delayDays(project, acts, d);
  const total = daysBetween(project.contractStart, project.contractFinish);
  const elapsed = Math.min(total, Math.max(0, daysBetween(project.contractStart, d)));
  const curve = sCurve(project, acts, d);
  const trend = delayTrend(project, acts, d);
  const works = byWork(project, acts, d);
  const forecast = addDays(project.contractFinish, -delay);
  const behind = works.filter((w) => w.variance < -0.0001).sort((a, b) => a.variance - b.variance).slice(0, 5);
  const noProgress = project.dataDates.length === 0;

  const health =
    s.spi >= 0.98 && s.cpi >= 0.98 ? { tone: "good" as const, text: tr("المشروع ماشي حسب الخطة", "On track") }
    : s.spi < 0.9 || s.cpi < 0.9 ? { tone: "bad" as const, text: tr("المشروع بحاجة تدخّل", "Needs intervention") }
    : { tone: "warn" as const, text: tr("في انحراف بسيط عن الخطة", "Slightly off plan") };

  return (
    <>
      <FilterBar project={project} f={f} setF={setF} />

      {noProgress && (
        <div className="mb-5 rounded-2xl border border-amber-200 bg-warn-soft p-4 text-sm text-amber-800">
          {tr("ما في تحديثات تقدم لسا، فكل القيم الفعلية صفر.", "No progress updates yet, so all actual values are zero.")}{" "}
          <Link href={`/projects/${project.id}/progress`} className="font-semibold underline">{tr("سجّل أول تحديث", "Record the first update")}</Link>
        </div>
      )}

      {/* headline */}
      <div className="mb-5 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <div className="flex items-center gap-2">
            <Badge tone={health.tone}>{health.text}</Badge>
            <span className="num ms-auto text-xs text-muted">Data Date: {fmtDate(d)}</span>
          </div>
          <div className="mt-4 flex items-end gap-3">
            <div className="num text-5xl font-bold text-ink">{pct(s.actualPct, 1)}</div>
            <div className="pb-2 text-sm text-muted">{tr("منجز من أصل", "complete of")} <span className="num font-semibold text-ink">{pct(s.plannedPct, 1)}</span> {tr("مخطط", "planned")}</div>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100" dir="ltr">
            <div className="relative h-full">
              <div className="absolute inset-y-0 left-0 rounded-full bg-indigo-200" style={{ width: `${s.plannedPct * 100}%` }} />
              <div className="absolute inset-y-0 left-0 rounded-full bg-orange-500" style={{ width: `${s.actualPct * 100}%` }} />
            </div>
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted">
            <span>🟧 {tr("فعلي", "Actual")}</span><span>🟪 {tr("مخطط", "Planned")}</span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            {tr(
              `${delay < 0 ? `متأخر ${-delay} يوم` : delay > 0 ? `متقدم ${delay} يوم` : "على الموعد"} عن الخطة، والانتهاء المتوقع ${fmtDate(forecast)}. التكلفة ${s.cpi >= 1 ? "ضمن الميزانية" : "فوق الميزانية"}، والتكلفة المتوقعة عند الانتهاء ${money(e.eac)} من ميزانية ${money(s.bac)}.`,
              `${delay < 0 ? `${-delay} days behind` : delay > 0 ? `${delay} days ahead of` : "On"} schedule, forecast finish ${fmtDate(forecast)}. Cost is ${s.cpi >= 1 ? "within" : "over"} budget, with an estimate at completion of ${money(e.eac)} against a budget of ${money(s.bac)}.`,
            )}
          </p>
        </Card>

        <div className="grid grid-cols-2 gap-4 lg:col-span-2 lg:grid-cols-3">
          <Stat
            label={tr("مؤشر أداء الجدول SPI", "Schedule performance SPI")}
            value={s.spi.toFixed(2)}
            tone={s.spi < 0.95 ? "bad" : s.spi < 1 ? "warn" : "good"}
            formula={{
              expr: "SPI = EV ÷ PV",
              calc: `${money(s.ev)} ÷ ${money(s.pv)} = ${s.spi.toFixed(3)}`,
              meaning: tr("أقل من 1 يعني الإنجاز أبطأ من المخطط. مثلاً 0.90 يعني منجزين 90% من اللي كان لازم يتنجز لهاليوم.", "Below 1 means progress is slower than planned. E.g. 0.90 means 90% of the work that should be done by today is done."),
            }}
          />
          <Stat
            label={tr("مؤشر أداء التكلفة CPI", "Cost performance CPI")}
            value={s.cpi.toFixed(2)}
            tone={s.cpi < 0.95 ? "bad" : s.cpi < 1 ? "warn" : "good"}
            formula={{
              expr: "CPI = EV ÷ AC",
              calc: `${money(s.ev)} ÷ ${money(s.ac)} = ${s.cpi.toFixed(3)}`,
              meaning: tr("أقل من 1 يعني عم نصرف أكتر من قيمة الشغل المنجز.", "Below 1 means we are spending more than the value of the work done."),
            }}
          />
          <Stat
            label={tr("التأخير / التقدم (يوم)", "Delay / ahead (days)")}
            value={String(delay)}
            tone={delay < 0 ? "bad" : "good"}
            formula={{
              expr: "Delay = ES − Data Date",
              calc: `ES = ${tr("التاريخ اللي كان المخطط فيه", "the date when planned value was")} ${money(s.ev)}`,
              meaning: tr("طريقة Earned Schedule: بندوّر بالخطة على اليوم اللي القيمة المخططة فيه بتساوي القيمة المكتسبة اليوم، والفرق بينه وبين Data Date هو التأخير.", "Earned Schedule: find the day in the plan when planned value equals today's earned value; the gap between that day and the data date is the delay."),
            }}
          />
          <Stat
            label={tr("الانتهاء المتوقع", "Forecast finish")}
            value={fmtDate(forecast)}
            tone={delay < 0 ? "bad" : undefined}
            formula={{
              expr: "Forecast = Contract Finish + |Delay|",
              calc: `${fmtDate(project.contractFinish)} + ${-delay} ${tr("يوم", "days")}`,
              meaning: tr("بيفترض إنه التأخير الحالي رح يضل نفسه لآخر المشروع.", "Assumes the current delay stays the same until the end."),
            }}
          />
          <Stat
            label={tr("التكلفة المتوقعة EAC", "Estimate at completion EAC")}
            value={money(e.eac)}
            tone={e.eac > s.bac ? "bad" : "good"}
            sub={<span className="num">BAC {money(s.bac)}</span>}
            formula={{
              expr: "EAC = BAC ÷ CPI",
              calc: `${money(s.bac)} ÷ ${s.cpi.toFixed(3)} = ${money(e.eac)}`,
              meaning: tr("إذا ضل أداء التكلفة نفسه، هيك رح تكون التكلفة الكلية عند الانتهاء.", "If cost performance stays the same, this is the total cost at completion."),
            }}
          />
          <Stat
            label={tr("انحراف الإنجاز", "Progress variance")}
            value={pct(s.variancePct)}
            tone={s.variancePct < 0 ? "bad" : "good"}
            formula={{
              expr: "Variance = Actual % − Planned %",
              calc: `${pct(s.actualPct)} − ${pct(s.plannedPct)} = ${pct(s.variancePct)}`,
              meaning: tr("النسب موزونة بالميزانية: النشاط الأغلى إله وزن أكبر بالنسبة الكلية.", "Percentages are budget-weighted: costlier activities weigh more in the total."),
            }}
          />
        </div>
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-3">
        <Card title={tr("منحنى التقدم (S-Curve)", "Progress curve (S-curve)")} subtitle={tr("نسبة الإنجاز التراكمية موزونة بالتكلفة", "Cumulative progress, cost-weighted")} className="lg:col-span-2">
          <div className="h-72" dir="ltr">
            <ResponsiveContainer>
              <ComposedChart data={curve}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="date" tickFormatter={monthLabel} minTickGap={40} {...axis} />
                <YAxis {...axis} unit="%" domain={[0, 100]} />
                <Tooltip labelFormatter={(l) => fmtDate(String(l))} formatter={(v) => `${Number(v).toFixed(2)}%`} contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <ReferenceLine x={d} stroke={AMBER} strokeDasharray="4 4" />
                <Area type="monotone" dataKey="planned" name="Planned" stroke={TEAL} fill={TEAL} fillOpacity={0.12} strokeWidth={2} />
                <Line type="monotone" dataKey="actual" name="Actual" stroke={CORAL} strokeWidth={3} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title={tr("بحاجة انتباه", "Needs attention")} subtitle={tr("أكتر أنواع العمل تأخراً", "Most delayed types of work")}>
          {behind.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">{tr("ما في أعمال متأخرة 👌", "Nothing is behind 👌")}</p>
          ) : (
            <ul className="space-y-3">
              {behind.map((w) => (
                <li key={w.name}>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="me-auto font-medium">{w.name}</span>
                    <span className="num font-semibold text-bad">{pct(w.variance, 1)}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100" dir="ltr">
                    <div className="relative h-full">
                      <div className="absolute inset-y-0 left-0 bg-indigo-200" style={{ width: `${w.early * 100}%` }} />
                      <div className="absolute inset-y-0 left-0 bg-orange-500" style={{ width: `${w.actual * 100}%` }} />
                    </div>
                  </div>
                  <div className="num mt-0.5 text-end text-[11px] text-muted">{pct(w.actual, 1)} / {pct(w.early, 1)}</div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-4">
        <Stat label={tr("الميزانية BAC", "Budget BAC")} value={money(s.bac)} formula={{ expr: "BAC = Σ Budget Cost", meaning: tr("مجموع ميزانيات الأنشطة ضمن الفلتر.", "Sum of activity budgets within the filter.") }} />
        <Stat label={tr("القيمة المخططة PV", "Planned value PV")} value={money(s.pv)} formula={{ expr: "PV = Σ (Budget × Planned %)", meaning: tr("قيمة الشغل اللي كان لازم يكون منجز لهاليوم حسب Early dates، مع توزيع خطي بين البداية والنهاية.", "Value of work that should be done by today per the early dates, spread linearly between start and finish.") }} />
        <Stat label={tr("القيمة المكتسبة EV", "Earned value EV")} value={money(s.ev)} formula={{ expr: "EV = Σ (Budget × Actual %)", meaning: tr("قيمة الشغل المنجز فعلياً بأسعار الميزانية.", "Value of the work actually done, at budget rates.") }} />
        <Stat label={tr("التكلفة الفعلية AC", "Actual cost AC")} value={money(s.ac)} tone={s.ac > s.ev ? "bad" : undefined} formula={{ expr: "AC = Σ Actual Cost", meaning: tr("المصروف الفعلي التراكمي المسجّل لكل نشاط.", "Cumulative actual spend recorded for each activity.") }} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title={tr("تريند التأخير (يوم)", "Delay trend (days)")} className="lg:col-span-1">
          <div className="h-56" dir="ltr">
            <ResponsiveContainer>
              <ComposedChart data={trend}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="date" tickFormatter={monthLabel} minTickGap={30} {...axis} />
                <YAxis {...axis} />
                <Tooltip labelFormatter={(l) => fmtDate(String(l))} contentStyle={tooltipStyle} />
                <ReferenceLine y={0} stroke="#cbd5e1" />
                <Area type="monotone" dataKey="delay" name="Delay" stroke={BAD} fill={BAD} fillOpacity={0.1} strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted">
            <span>{tr("الوقت المنقضي", "Time elapsed")}</span>
            <span className="num font-semibold text-ink">{pct(total ? elapsed / total : 0, 1)}</span>
          </div>
        </Card>
        <Card title={tr("التقدم حسب نوع العمل", "Progress by type of work")} className="lg:col-span-2" pad={false}>
          <div className="max-h-80 overflow-auto"><WorkTable works={works} /></div>
        </Card>
      </div>
    </>
  );
}

export function WorkTable({ works }: { works: ReturnType<typeof byWork> }) {
  const tr = useTr();
  return (
    <table className="w-full text-sm">
      <thead className="sticky top-0 bg-slate-50 text-xs text-muted">
        <tr>
          <th className="px-4 py-2 text-start font-medium">{tr("نوع العمل", "Type of work")}</th>
          <th className="px-3 py-2 text-end font-medium">Early</th>
          <th className="px-3 py-2 text-end font-medium">Late</th>
          <th className="px-3 py-2 text-end font-medium">Actual</th>
          <th className="px-4 py-2 text-end font-medium">{tr("الانحراف", "Variance")}</th>
        </tr>
      </thead>
      <tbody>
        {works.map((w) => (
          <tr key={w.name} className="border-t border-line">
            <td className="px-4 py-2 font-medium">{w.name}</td>
            <td className="num px-3 py-2 text-end text-muted">{pct(w.early)}</td>
            <td className="num px-3 py-2 text-end text-muted">{pct(w.late)}</td>
            <td className="num px-3 py-2 text-end">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-orange-500" style={{ width: `${w.actual * 100}%` }} /></div>
                {pct(w.actual)}
              </div>
            </td>
            <td className={cx("num px-4 py-2 text-end font-semibold", w.variance < -0.0001 ? "text-bad" : "text-good")}>{pct(w.variance)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
