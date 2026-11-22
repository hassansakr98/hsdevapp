"use client";

import { useState } from "react";
import {
  Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, LineChart, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  addDays, byWork, delayDays, evTrend, evm, groupBy, matrix, sCurve, snapshot, type GroupKey, type Metric,
} from "@/lib/calc";
import {
  AMBER, BAD, BLUE, CORAL, Card, GREEN, GRID, Kpi, TEAL, fmtDate, money, monthLabel, pct, tooltipStyle, type PageProps,
} from "./ui";
import { WorkTable } from "./Overview";
import { useTr } from "../LangProvider";
import type { Tr } from "@/lib/i18n";

const axis = { stroke: "#94a3b8", fontSize: 11 };
const dateAxis = { dataKey: "date", tickFormatter: monthLabel, minTickGap: 40, ...axis };
const pctFmt = (v: unknown) => `${Number(v).toFixed(2)}%`;
const moneyFmt = (v: unknown): string => money(Number(v));
const H = ({ children }: { children: React.ReactNode }) => <div className="h-80">{children}</div>;

function Toggle<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-1 rounded-lg bg-canvas p-1 text-sm">
      {options.map(([v, label]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`rounded px-3 py-1 ${value === v ? "bg-brand text-white" : "text-muted hover:text-ink"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

const groups = (tr: Tr): [GroupKey, string][] => [
  ["name", tr("نوع العمل", "Type of Work")], ["zone", "Zone"], ["floor", tr("الطابق", "Floor")], ["category", tr("التصنيف", "Category")], ["type", tr("النوع", "Type")],
];

/* 1 & 2 — Progress curves (cost / manhour) */
export function ProgressCurve({ project, acts, dataDate, metric }: PageProps & { metric: Metric }) {
  const tr = useTr();
  const data = sCurve(project, acts, dataDate, metric);
  const s = snapshot(project, acts, dataDate);
  const planned = metric === "cost" ? s.plannedPct : s.plannedPctMh;
  const actual = metric === "cost" ? s.actualPct : s.actualPctMh;
  const label = metric === "cost" ? tr("التكلفة", "Cost") : tr("الساعات", "Manhours");
  return (
    <>
      <section className="grid grid-cols-4 gap-3">
        <Kpi label={`${tr("الميزانية", "Budget")} (${label})`} value={metric === "cost" ? money(s.bac) : `${money(s.bacMh)} MH`} />
        <Kpi label={tr("المخطط %", "Planned %")} value={pct(planned)} />
        <Kpi label={tr("الفعلي %", "Actual %")} value={pct(actual)} bad={actual < planned} />
        <Kpi label={tr("الانحراف %", "Variance %")} value={pct(actual - planned)} bad={actual < planned} />
      </section>
      <Card title={`${tr("منحنى التقدم التراكمي", "Cumulative progress curve")} - ${label}`}>
        <H>
          <ResponsiveContainer>
            <ComposedChart data={data}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis {...dateAxis} />
              <YAxis {...axis} unit="%" domain={[0, 100]} />
              <Tooltip labelFormatter={(l) => fmtDate(String(l))} formatter={pctFmt} contentStyle={tooltipStyle} />
              <Legend />
              <ReferenceLine x={dataDate} stroke={AMBER} strokeDasharray="4 4" label={{ value: "Data Date", fill: AMBER, fontSize: 11 }} />
              <Area type="monotone" dataKey="planned" name="Early Planned %" stroke={TEAL} fill={TEAL} fillOpacity={0.35} />
              <Line type="monotone" dataKey="late" name="Late Planned %" stroke={BLUE} strokeDasharray="5 4" dot={false} />
              <Line type="monotone" dataKey="actual" name="Actual %" stroke={CORAL} strokeWidth={3} dot={false} connectNulls={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </H>
      </Card>
      <Card title={`${tr("التقدم الشهري", "Monthly progress")} - ${label}`}>
        <div className="h-60">
          <ResponsiveContainer>
            <BarChart data={data}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis {...dateAxis} />
              <YAxis {...axis} unit="%" />
              <Tooltip labelFormatter={(l) => fmtDate(String(l))} formatter={pctFmt} contentStyle={tooltipStyle} />
              <Legend />
              <Bar dataKey="periodPlanned" name={tr("مخطط (شهري)", "Planned (month)")} fill={TEAL} />
              <Bar dataKey="periodActual" name={tr("فعلي (شهري)", "Actual (month)")} fill={CORAL} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </>
  );
}

/* 3 — Progress matrix */
export function ProgressMatrix({ project, acts, dataDate }: PageProps) {
  const tr = useTr();
  const [rowKey, setRow] = useState<GroupKey>("zone");
  const [colKey, setCol] = useState<GroupKey>("floor");
  const m = matrix(project, acts, dataDate, rowKey, colKey);
  const color = (v: number) => (v >= -0.001 ? GREEN : v > -0.05 ? "#d97706" : BAD);
  return (
    <Card title={tr("مصفوفة التقدم (فعلي % / مخطط %)", "Progress matrix (Actual % / Planned %)")}>
      <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
        <span>{tr("الصفوف", "Rows")}</span>
        <Toggle value={rowKey} options={groups(tr)} onChange={setRow} />
        <span>{tr("الأعمدة", "Columns")}</span>
        <Toggle value={colKey} options={groups(tr)} onChange={setCol} />
      </div>
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-muted">
              <th className="p-2 text-left" />
              {m.cols.map((c) => <th key={c} className="p-2">{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {m.rows.map((r, i) => (
              <tr key={r} className="border-b border-line">
                <td className="whitespace-nowrap p-2 font-medium">{r}</td>
                {m.cells[i].map((s, j) => (
                  <td key={j} className="p-1 text-center">
                    {s ? (
                      <div className="rounded p-1.5" style={{ background: `${color(s.variancePct)}33`, border: `1px solid ${color(s.variancePct)}` }}>
                        <div className="font-semibold">{pct(s.actualPct, 1)}</div>
                        <div className="text-xs text-muted">{tr("من", "of")} {pct(s.plannedPct, 1)}</div>
                      </div>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex gap-4 text-xs text-muted">
        <span><span className="inline-block h-2 w-2 rounded-full" style={{ background: GREEN }} /> {tr("حسب الخطة / متقدم", "On / ahead")}</span>
        <span><span className="inline-block h-2 w-2 rounded-full" style={{ background: "#d97706" }} /> {tr("متأخر < 5%", "Behind < 5%")}</span>
        <span><span className="inline-block h-2 w-2 rounded-full" style={{ background: BAD }} /> {tr("متأخر ≥ 5%", "Behind ≥ 5%")}</span>
      </div>
    </Card>
  );
}

/* 4 — Planned vs actual bars by any grouping */
export function PlannedActualBars({ project, acts, dataDate }: PageProps) {
  const tr = useTr();
  const [key, setKey] = useState<GroupKey>("name");
  const data = groupBy(project, acts, dataDate, key)
    .map(({ name, s }) => ({
      name,
      Early: +(s.plannedPct * 100).toFixed(2),
      Late: s.bac ? +((s.pvLate / s.bac) * 100).toFixed(2) : 0,
      Actual: +(s.actualPct * 100).toFixed(2),
    }))
    .sort((a, b) => b.Early - a.Early);
  return (
    <Card title={tr("المخطط مقابل الفعلي %", "Planned vs actual %")}>
      <div className="mb-3"><Toggle value={key} options={groups(tr)} onChange={setKey} /></div>
      <div style={{ height: Math.max(300, data.length * 34) }}>
        <ResponsiveContainer>
          <BarChart data={data} layout="vertical" margin={{ left: 40 }}>
            <CartesianGrid stroke={GRID} horizontal={false} />
            <XAxis type="number" domain={[0, 100]} unit="%" {...axis} />
            <YAxis type="category" dataKey="name" width={190} stroke="#475569" fontSize={11} />
            <Tooltip formatter={(v) => `${v}%`} contentStyle={tooltipStyle} />
            <Legend />
            <Bar dataKey="Early" name="Early Planned %" fill={TEAL} barSize={7} />
            <Bar dataKey="Late" name="Late Planned %" fill={BLUE} barSize={7} />
            <Bar dataKey="Actual" name="Actual %" fill={CORAL} barSize={7} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

/* 5 — Activity progress trend % */
export function ActivityTrendPct({ project, acts, dataDate }: PageProps) {
  const tr = useTr();
  const works = [...new Set(acts.map((a) => a.name))].sort();
  const [work, setWork] = useState("All");
  const subset = work === "All" ? acts : acts.filter((a) => a.name === work);
  const data = evTrend(project, subset, dataDate);
  return (
    <>
      <Card title={tr("تريند إنجاز الأنشطة %", "Activity progress trend %")}>
        <label className="mb-3 flex items-center gap-2 text-sm">
          {tr("نوع العمل", "Type of Work")}
          <select value={work} onChange={(e) => setWork(e.target.value)} className="rounded border border-line bg-panel px-2 py-1 text-brand">
            <option value="All">{tr("الكل", "All")}</option>
            {works.map((w) => <option key={w}>{w}</option>)}
          </select>
        </label>
        <H>
          <ResponsiveContainer>
            <LineChart data={data}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis {...dateAxis} />
              <YAxis {...axis} unit="%" />
              <Tooltip labelFormatter={(l) => fmtDate(String(l))} formatter={pctFmt} contentStyle={tooltipStyle} />
              <Legend />
              <Line dataKey="plannedPct" name="Planned % (Cost)" stroke={TEAL} strokeWidth={2} dot={false} />
              <Line dataKey="actualPct" name="Actual % (Cost)" stroke={CORAL} strokeWidth={2} dot={false} />
              <Line dataKey="plannedPctMh" name="Planned % (MH)" stroke={TEAL} strokeDasharray="4 4" dot={false} />
              <Line dataKey="actualPctMh" name="Actual % (MH)" stroke={CORAL} strokeDasharray="4 4" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </H>
      </Card>
      <Card title={tr("التقدم حسب نوع العمل", "Progress by type of work")} className="max-h-96 overflow-auto">
        <WorkTable works={byWork(project, acts, dataDate)} />
      </Card>
    </>
  );
}

/* 6 — EV trend (PV / EV / AC) */
export function ActivityTrendEV({ project, acts, dataDate }: PageProps) {
  const tr = useTr();
  const data = evTrend(project, acts, dataDate);
  const last = data.at(-1);
  return (
    <>
      <section className="grid grid-cols-3 gap-3">
        <Kpi label={tr("القيمة المخططة PV", "Planned Value (PV)")} value={money(last?.pv ?? 0)} />
        <Kpi label={tr("القيمة المكتسبة EV", "Earned Value (EV)")} value={money(last?.ev ?? 0)} bad={(last?.ev ?? 0) < (last?.pv ?? 0)} />
        <Kpi label={tr("التكلفة الفعلية AC", "Actual Cost (AC)")} value={money(last?.ac ?? 0)} bad={(last?.ac ?? 0) > (last?.ev ?? 0)} />
      </section>
      <Card title={tr("تريند PV / EV / AC", "PV / EV / AC trend")}>
        <H>
          <ResponsiveContainer>
            <LineChart data={data}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis {...dateAxis} />
              <YAxis {...axis} tickFormatter={moneyFmt} />
              <Tooltip labelFormatter={(l) => fmtDate(String(l))} formatter={moneyFmt} contentStyle={tooltipStyle} />
              <Legend />
              <Line dataKey="pv" name="PV" stroke={TEAL} strokeWidth={2} dot={false} />
              <Line dataKey="ev" name="EV" stroke={CORAL} strokeWidth={2} dot={false} />
              <Line dataKey="ac" name="AC" stroke={AMBER} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </H>
      </Card>
    </>
  );
}

/* 7 — Cost variance trend */
export function CostVarianceTrend({ project, acts, dataDate }: PageProps) {
  const tr = useTr();
  const data = evTrend(project, acts, dataDate);
  return (
    <>
      <Card title={tr("انحراف التكلفة (CV = EV − AC) وانحراف الجدول (SV = EV − PV)", "Cost variance (CV = EV − AC) & schedule variance (SV = EV − PV)")}>
        <H>
          <ResponsiveContainer>
            <ComposedChart data={data}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis {...dateAxis} />
              <YAxis {...axis} tickFormatter={moneyFmt} />
              <Tooltip labelFormatter={(l) => fmtDate(String(l))} formatter={moneyFmt} contentStyle={tooltipStyle} />
              <Legend />
              <ReferenceLine y={0} stroke="#888" />
              <Bar dataKey="cv" name="CV">
                {data.map((d) => <Cell key={d.date} fill={d.cv >= 0 ? GREEN : BAD} />)}
              </Bar>
              <Line dataKey="sv" name="SV" stroke={TEAL} strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </H>
      </Card>
      <Card title={tr("تريند CPI وSPI", "CPI & SPI trend")}>
        <div className="h-60">
          <ResponsiveContainer>
            <LineChart data={data}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis {...dateAxis} />
              <YAxis {...axis} domain={["auto", "auto"]} />
              <Tooltip labelFormatter={(l) => fmtDate(String(l))} formatter={(v) => Number(v).toFixed(3)} contentStyle={tooltipStyle} />
              <Legend />
              <ReferenceLine y={1} stroke={GREEN} strokeDasharray="4 4" />
              <Line dataKey="cpi" name="CPI" stroke={AMBER} strokeWidth={2} dot={false} />
              <Line dataKey="spi" name="SPI" stroke={TEAL} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </>
  );
}

/* 8 — Delay / ahead trend */
export function DelayTrend({ project, acts, dataDate }: PageProps) {
  const tr = useTr();
  const data = evTrend(project, acts, dataDate);
  const delay = delayDays(project, acts, dataDate);
  const worst = data.reduce((m, d) => Math.min(m, d.delay), 0);
  return (
    <>
      <section className="grid grid-cols-4 gap-3">
        <Kpi label={tr("التأخير/التقدم الحالي (يوم)", "Current delay/ahead (days)")} value={String(delay)} bad={delay < 0} />
        <Kpi label={tr("أسوأ تأخير (يوم)", "Worst delay (days)")} value={String(worst)} bad={worst < 0} />
        <Kpi label={tr("نهاية العقد", "Contract finish")} value={fmtDate(project.contractFinish)} />
        <Kpi label={tr("الانتهاء المتوقع", "Forecast finish")} value={fmtDate(addDays(project.contractFinish, -delay))} bad={delay < 0} />
      </section>
      <Card title={tr("تريند تأخير/تقدم المشروع (يوم)", "Project delay / ahead trend (days)")}>
        <H>
          <ResponsiveContainer>
            <ComposedChart data={data}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis {...dateAxis} />
              <YAxis {...axis} />
              <Tooltip labelFormatter={(l) => fmtDate(String(l))} contentStyle={tooltipStyle} />
              <ReferenceLine y={0} stroke="#888" />
              <Area type="monotone" dataKey="delay" name={tr("التأخير (يوم)", "Delay (days)")} stroke={CORAL} fill={CORAL} fillOpacity={0.25} />
            </ComposedChart>
          </ResponsiveContainer>
        </H>
      </Card>
      <p className="text-xs text-gray-400">
        {tr("التأخير محسوب بطريقة Earned Schedule: التاريخ اللي القيمة المخططة فيه بتساوي القيمة المكتسبة اليوم، مقارنة مع Data Date.", "Delay uses the Earned Schedule method: the date on which the planned value equals today's earned value, compared with the data date.")}
      </p>
    </>
  );
}

/* 9 — Cost variance breakdown */
export function CostVarianceBreakdown({ project, acts, dataDate }: PageProps) {
  const tr = useTr();
  const [key, setKey] = useState<GroupKey>("name");
  const rows = groupBy(project, acts, dataDate, key)
    .map(({ name, s }) => ({ name, ...s, cv: s.ev - s.ac, sv: s.ev - s.pv }))
    .filter((r) => r.ev > 0 || r.ac > 0)
    .sort((a, b) => a.cv - b.cv);
  return (
    <>
      <Card title={tr("تفصيل انحراف التكلفة (CV = EV − AC)", "Cost variance breakdown (CV = EV − AC)")}>
        <div className="mb-3"><Toggle value={key} options={groups(tr)} onChange={setKey} /></div>
        <div style={{ height: Math.max(260, rows.length * 30) }}>
          <ResponsiveContainer>
            <BarChart data={rows} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid stroke={GRID} horizontal={false} />
              <XAxis type="number" {...axis} tickFormatter={moneyFmt} />
              <YAxis type="category" dataKey="name" width={190} stroke="#475569" fontSize={11} />
              <Tooltip formatter={moneyFmt} contentStyle={tooltipStyle} />
              <ReferenceLine x={0} stroke="#888" />
              <Bar dataKey="cv" name="CV" barSize={14}>
                {rows.map((r) => <Cell key={r.name} fill={r.cv >= 0 ? GREEN : BAD} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card className="overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-muted text-left">
            <tr>{[tr("الاسم", "Name"), "BAC", "PV", "EV", "AC", "CV", "SV", "CPI", "SPI"].map((h) => <th key={h} className="p-1.5">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="border-b border-line">
                <td className="p-1.5">{r.name}</td>
                <td className="p-1.5">{money(r.bac)}</td>
                <td className="p-1.5">{money(r.pv)}</td>
                <td className="p-1.5">{money(r.ev)}</td>
                <td className="p-1.5">{money(r.ac)}</td>
                <td className={`p-1.5 ${r.cv < 0 ? "text-bad" : "text-good"}`}>{money(r.cv)}</td>
                <td className={`p-1.5 ${r.sv < 0 ? "text-bad" : "text-good"}`}>{money(r.sv)}</td>
                <td className={`p-1.5 ${r.cpi < 1 ? "text-bad" : ""}`}>{r.cpi.toFixed(2)}</td>
                <td className={`p-1.5 ${r.spi < 1 ? "text-bad" : ""}`}>{r.spi.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

/* 10 — Earned value analysis */
export function EarnedValueAnalysis({ project, acts, dataDate }: PageProps) {
  const tr = useTr();
  const s = snapshot(project, acts, dataDate);
  const e = evm(s);
  const rows: [string, string, string, boolean?][] = [
    ["BAC", tr("الميزانية عند الانتهاء", "Budget at Completion"), money(s.bac)],
    ["PV", tr("القيمة المخططة", "Planned Value"), money(s.pv)],
    ["EV", tr("القيمة المكتسبة", "Earned Value"), money(s.ev)],
    ["AC", tr("التكلفة الفعلية", "Actual Cost"), money(s.ac)],
    ["SV", tr("انحراف الجدول = EV − PV", "Schedule Variance = EV − PV"), money(e.sv), e.sv < 0],
    ["CV", tr("انحراف التكلفة = EV − AC", "Cost Variance = EV − AC"), money(e.cv), e.cv < 0],
    ["SPI", tr("مؤشر أداء الجدول = EV / PV", "Schedule Performance Index = EV / PV"), s.spi.toFixed(3), s.spi < 1],
    ["CPI", tr("مؤشر أداء التكلفة = EV / AC", "Cost Performance Index = EV / AC"), s.cpi.toFixed(3), s.cpi < 1],
    ["EAC", tr("التكلفة المتوقعة عند الانتهاء = BAC / CPI", "Estimate at Completion = BAC / CPI"), money(e.eac), e.eac > s.bac],
    ["EAC (CPI×SPI)", "AC + (BAC − EV) / (CPI × SPI)", money(e.eacCombined), e.eacCombined > s.bac],
    ["ETC", tr("المتبقي للإنجاز = EAC − AC", "Estimate to Complete = EAC − AC"), money(e.etc)],
    ["VAC", tr("الانحراف عند الانتهاء = BAC − EAC", "Variance at Completion = BAC − EAC"), money(e.vac), e.vac < 0],
    ["TCPI", tr("مؤشر الأداء المطلوب = (BAC − EV) / (BAC − AC)", "To-Complete Performance Index = (BAC − EV) / (BAC − AC)"), e.tcpi.toFixed(3), e.tcpi > 1],
  ];
  const bars = [
    { name: "BAC", value: s.bac, fill: BLUE },
    { name: "EAC", value: e.eac, fill: e.eac > s.bac ? CORAL : GREEN },
    { name: "PV", value: s.pv, fill: TEAL },
    { name: "EV", value: s.ev, fill: CORAL },
    { name: "AC", value: s.ac, fill: AMBER },
  ];
  return (
    <>
      <section className="grid grid-cols-4 gap-3">
        <Kpi label="SPI" value={s.spi.toFixed(2)} bad={s.spi < 1} />
        <Kpi label="CPI" value={s.cpi.toFixed(2)} bad={s.cpi < 1} />
        <Kpi label="EAC" value={money(e.eac)} bad={e.eac > s.bac} />
        <Kpi label="VAC" value={money(e.vac)} bad={e.vac < 0} />
      </section>
      <section className="grid grid-cols-2 gap-3">
        <Card title={tr("مؤشرات القيمة المكتسبة", "Earned value indicators")}>
          <table className="w-full text-sm">
            <tbody>
              {rows.map(([k, desc, v, bad]) => (
                <tr key={k} className="border-b border-line">
                  <td className="p-1.5 font-semibold text-brand">{k}</td>
                  <td className="p-1.5 text-muted">{desc}</td>
                  <td className={`p-1.5 text-right font-semibold ${bad ? "text-bad" : ""}`}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card title={tr("الميزانية مقابل المتوقع", "Budget vs forecast")}>
          <H>
            <ResponsiveContainer>
              <BarChart data={bars}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="name" {...axis} />
                <YAxis {...axis} tickFormatter={moneyFmt} />
                <Tooltip formatter={moneyFmt} contentStyle={tooltipStyle} />
                <Bar dataKey="value">
                  {bars.map((b) => <Cell key={b.name} fill={b.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </H>
        </Card>
      </section>
    </>
  );
}
