"use client";

import { useEffect } from "react";
import {
  Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, LineChart, ReferenceLine, XAxis, YAxis,
} from "recharts";
import {
  addDays, byWork, daysBetween, delayDays, evTrend, evm, filterActivities, groupBy, sCurve, snapshot,
} from "@/lib/calc";
import type { Filters, Project } from "@/lib/types";
import { fmtDate, money, monthLabel, pct } from "./dashboard/ui";

// Print-friendly palette (light background)
const TEAL = "#1f8a7e";
const CORAL = "#d64545";
const AMBER = "#c98a00";
const BLUE = "#5458b0";
const GREEN = "#2e9a5c";
const W = 720; // chart width in px (fits A4 portrait with margins)

const axis = { stroke: "#555", fontSize: 10 };
const dateAxis = { dataKey: "date", tickFormatter: monthLabel, minTickGap: 40, ...axis };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="report-section mb-6">
      <h2 className="mb-2 border-b-2 border-[#5458b0] pb-1 text-base font-bold text-[#1f2a5a]">{title}</h2>
      {children}
    </section>
  );
}

function Stat({ label, value, bad }: { label: string; value: string; bad?: boolean }) {
  return (
    <div className="rounded border border-gray-300 p-2 text-center">
      <div className="text-[10px] uppercase tracking-wide text-gray-500">{label}</div>
      <div className={`text-lg font-bold ${bad ? "text-[#d64545]" : "text-gray-900"}`}>{value}</div>
    </div>
  );
}

export default function Report({
  project, filters, company, preparedBy, autoPrint,
}: { project: Project; filters: Filters; company: string; preparedBy: string; autoPrint: boolean }) {
  useEffect(() => {
    if (!autoPrint) return;
    const t = setTimeout(() => window.print(), 800); // let charts render first
    return () => clearTimeout(t);
  }, [autoPrint]);

  const acts = filterActivities(project, filters);
  const d = filters.dataDate;
  const s = snapshot(project, acts, d);
  const e = evm(s);
  const delay = delayDays(project, acts, d);
  const total = daysBetween(project.contractStart, project.contractFinish);
  const elapsed = Math.min(total, Math.max(0, daysBetween(project.contractStart, d)));
  const curve = sCurve(project, acts, d);
  const trend = evTrend(project, acts, d);
  const works = byWork(project, acts, d);
  const cvRows = groupBy(project, acts, d, "name")
    .map(({ name, s }) => ({ name, cv: s.ev - s.ac }))
    .filter((r) => r.cv !== 0)
    .sort((a, b) => a.cv - b.cv);

  const active = (["zone", "floor", "category", "type"] as const)
    .filter((k) => filters[k] !== "All")
    .map((k) => `${k[0].toUpperCase() + k.slice(1)}: ${filters[k]}`);

  const behind = works
    .filter((w) => w.variance < -0.0001)
    .sort((a, b) => a.variance - b.variance)
    .slice(0, 3);

  return (
    <div dir="ltr" className="min-h-screen bg-gray-200 py-6 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-4 flex max-w-[210mm] items-center gap-3">
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-[#1f8a7e] px-4 py-2 font-semibold text-white hover:brightness-110"
        >
          طباعة / حفظ PDF
        </button>
        <span className="text-sm text-gray-600">اختار &quot;Save as PDF&quot; من نافذة الطباعة</span>
        <button onClick={() => window.close()} className="mr-auto text-sm text-gray-600 hover:underline">إغلاق</button>
      </div>

      <article className="report mx-auto max-w-[210mm] bg-white p-[12mm] text-gray-900 shadow-lg print:max-w-none print:p-0 print:shadow-none">
        <header className="mb-5 flex items-start justify-between border-b-4 border-[#c98a00] pb-3">
          <div>
            <div className="text-xs font-bold tracking-widest text-[#1f8a7e]">PROJECT PROGRESS REPORT</div>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <div className="text-sm text-gray-600">{company}</div>
          </div>
          <div className="text-right text-xs text-gray-600">
            <div>Data Date: <b className="text-gray-900">{fmtDate(d)}</b></div>
            <div>Generated: {fmtDate(new Date().toISOString().slice(0, 10))}</div>
            <div>Prepared by: {preparedBy}</div>
            <div>Scope: {active.length ? active.join(" · ") : "Whole project"}</div>
          </div>
        </header>

        <Section title="1. Executive Summary">
          <div className="mb-3 grid grid-cols-6 gap-2">
            <Stat label="Contract Start" value={fmtDate(project.contractStart)} />
            <Stat label="Contract Finish" value={fmtDate(project.contractFinish)} />
            <Stat label="Forecast Finish" value={fmtDate(addDays(project.contractFinish, -delay))} bad={delay < 0} />
            <Stat label="Delay/Ahead (d)" value={String(delay)} bad={delay < 0} />
            <Stat label="SPI" value={s.spi.toFixed(2)} bad={s.spi < 1} />
            <Stat label="CPI" value={s.cpi.toFixed(2)} bad={s.cpi < 1} />
          </div>
          <div className="grid grid-cols-4 gap-2">
            <Stat label="Planned % (Cost)" value={pct(s.plannedPct)} />
            <Stat label="Actual % (Cost)" value={pct(s.actualPct)} bad={s.actualPct < s.plannedPct} />
            <Stat label="Variance %" value={pct(s.variancePct)} bad={s.variancePct < 0} />
            <Stat label="Time Elapsed" value={pct(total ? elapsed / total : 0, 1)} />
          </div>
          <p className="mt-3 text-sm leading-relaxed">
            As of {fmtDate(d)} the project is <b>{pct(s.actualPct)}</b> complete against <b>{pct(s.plannedPct)}</b> planned
            {delay < 0 ? <>, <b className="text-[#d64545]">{-delay} days behind</b> schedule</> : delay > 0 ? <>, <b className="text-[#2e9a5c]">{delay} days ahead</b> of schedule</> : <>, on schedule</>}.
            {" "}Cost performance is {s.cpi >= 1 ? "on or under budget" : "over budget"} (CPI {s.cpi.toFixed(2)}),
            with an estimate at completion of <b>{money(e.eac)}</b> against a budget of <b>{money(s.bac)}</b>
            {" "}(VAC {money(e.vac)}).
            {behind.length > 0 && <> Largest slippage: {behind.map((w) => `${w.name} (${pct(w.variance)})`).join(", ")}.</>}
          </p>
        </Section>

        <Section title="2. Progress Curve (Cost)">
          <ComposedChart width={W} height={240} data={curve}>
            <CartesianGrid stroke="#ddd" vertical={false} />
            <XAxis {...dateAxis} />
            <YAxis {...axis} unit="%" domain={[0, 100]} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine x={d} stroke={AMBER} strokeDasharray="4 4" />
            <Area isAnimationActive={false} type="monotone" dataKey="planned" name="Early Planned %" stroke={TEAL} fill={TEAL} fillOpacity={0.2} />
            <Line isAnimationActive={false} type="monotone" dataKey="late" name="Late Planned %" stroke={BLUE} strokeDasharray="5 4" dot={false} />
            <Line isAnimationActive={false} type="monotone" dataKey="actual" name="Actual %" stroke={CORAL} strokeWidth={2.5} dot={false} />
          </ComposedChart>
        </Section>

        <Section title="3. Earned Value Indicators">
          <table className="w-full text-xs">
            <tbody>
              {([
                ["BAC", "Budget at Completion", money(s.bac)],
                ["PV", "Planned Value", money(s.pv)],
                ["EV", "Earned Value", money(s.ev)],
                ["AC", "Actual Cost", money(s.ac)],
                ["SV", "EV − PV", money(e.sv), e.sv < 0],
                ["CV", "EV − AC", money(e.cv), e.cv < 0],
                ["SPI", "EV / PV", s.spi.toFixed(3), s.spi < 1],
                ["CPI", "EV / AC", s.cpi.toFixed(3), s.cpi < 1],
                ["EAC", "BAC / CPI", money(e.eac), e.eac > s.bac],
                ["ETC", "EAC − AC", money(e.etc)],
                ["VAC", "BAC − EAC", money(e.vac), e.vac < 0],
                ["TCPI", "(BAC − EV) / (BAC − AC)", e.tcpi.toFixed(3), e.tcpi > 1],
              ] as [string, string, string, boolean?][]).map(([k, desc, v, bad], i) => (
                <tr key={k} className={i % 2 ? "bg-gray-50" : ""}>
                  <td className="p-1 font-bold">{k}</td>
                  <td className="p-1 text-gray-600">{desc}</td>
                  <td className={`p-1 text-right font-semibold ${bad ? "text-[#d64545]" : ""}`}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title="4. Schedule & Cost Trends">
          <div className="mb-1 text-xs font-semibold text-gray-600">Delay / Ahead (days)</div>
          <LineChart width={W} height={170} data={trend}>
            <CartesianGrid stroke="#ddd" vertical={false} />
            <XAxis {...dateAxis} />
            <YAxis {...axis} />
            <ReferenceLine y={0} stroke="#999" />
            <Line isAnimationActive={false} dataKey="delay" name="Delay" stroke={CORAL} strokeWidth={2} dot={false} />
          </LineChart>
          <div className="mb-1 mt-3 text-xs font-semibold text-gray-600">SPI & CPI</div>
          <LineChart width={W} height={170} data={trend}>
            <CartesianGrid stroke="#ddd" vertical={false} />
            <XAxis {...dateAxis} />
            <YAxis {...axis} domain={["auto", "auto"]} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine y={1} stroke={GREEN} strokeDasharray="4 4" />
            <Line isAnimationActive={false} dataKey="spi" name="SPI" stroke={TEAL} strokeWidth={2} dot={false} />
            <Line isAnimationActive={false} dataKey="cpi" name="CPI" stroke={AMBER} strokeWidth={2} dot={false} />
          </LineChart>
        </Section>

        <Section title="5. Progress by Type of Work">
          <table className="w-full text-xs">
            <thead className="bg-[#5458b0] text-left text-white">
              <tr>
                <th className="p-1">Type of Work</th>
                <th className="p-1 text-right">Early Planned</th>
                <th className="p-1 text-right">Late Planned</th>
                <th className="p-1 text-right">Actual</th>
                <th className="p-1 text-right">Variance</th>
              </tr>
            </thead>
            <tbody>
              {works.map((w, i) => (
                <tr key={w.name} className={i % 2 ? "bg-gray-50" : ""}>
                  <td className="p-1">{w.name}</td>
                  <td className="p-1 text-right">{pct(w.early)}</td>
                  <td className="p-1 text-right">{pct(w.late)}</td>
                  <td className="p-1 text-right">{pct(w.actual)}</td>
                  <td className={`p-1 text-right font-semibold ${w.variance < -0.0001 ? "text-[#d64545]" : "text-[#2e9a5c]"}`}>{pct(w.variance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        {cvRows.length > 0 && (
          <Section title="6. Cost Variance by Type of Work (EV − AC)">
            <BarChart width={W} height={Math.max(160, cvRows.length * 22)} data={cvRows} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid stroke="#ddd" horizontal={false} />
              <XAxis type="number" {...axis} tickFormatter={(v) => money(Number(v))} />
              <YAxis type="category" dataKey="name" width={180} {...axis} />
              <ReferenceLine x={0} stroke="#999" />
              <Bar isAnimationActive={false} dataKey="cv" barSize={12}>
                {cvRows.map((r) => <Cell key={r.name} fill={r.cv >= 0 ? GREEN : CORAL} />)}
              </Bar>
            </BarChart>
          </Section>
        )}

        <footer className="mt-6 border-t pt-2 text-center text-[10px] text-gray-500">
          Generated by hsdevapp · Earned value figures computed from uploaded schedule and progress data
        </footer>
      </article>
    </div>
  );
}
