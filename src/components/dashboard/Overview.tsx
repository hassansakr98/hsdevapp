"use client";

import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { addDays, byWork, daysBetween, delayDays, delayTrend, sCurve, snapshot } from "@/lib/calc";
import { AMBER, CORAL, Card, Donut, Gauge, Kpi, TEAL, fmtDate, money, monthLabel, pct, type PageProps } from "./ui";

export default function Overview({ project, acts, dataDate }: PageProps) {
  const s = snapshot(project, acts, dataDate);
  const delay = delayDays(project, acts, dataDate);
  const total = daysBetween(project.contractStart, project.contractFinish);
  const elapsed = Math.min(total, Math.max(0, daysBetween(project.contractStart, dataDate)));
  const curve = sCurve(project, acts, dataDate);
  const trend = delayTrend(project, acts, dataDate);
  const works = byWork(project, acts, dataDate);
  const activityBars = works
    .filter((w) => w.early > 0 && w.early < 1)
    .slice(0, 8)
    .map((w) => ({ name: w.name, Planned: +(w.early * 100).toFixed(2), Actual: +(w.actual * 100).toFixed(2) }));

  return (
    <>
      <section className="grid grid-cols-6 gap-3">
        <Kpi label="Contract Start" value={fmtDate(project.contractStart)} />
        <Kpi label="Contract Finish" value={fmtDate(project.contractFinish)} />
        <Kpi label="Forecasted Finish" value={fmtDate(addDays(project.contractFinish, -delay))} bad={delay < 0} />
        <Kpi label="Delay/Ahead (Days)" value={String(delay)} bad={delay < 0} />
        <Kpi label="Variance %" value={pct(s.variancePct)} bad={s.variancePct < 0} />
        <Kpi label="SPI" value={s.spi.toFixed(2)} bad={s.spi < 1} />
      </section>

      <section className="grid grid-cols-4 gap-3">
        <Gauge title="Planned vs Actual % (Cost)" planned={s.plannedPct} actual={s.actualPct} />
        <Gauge title="Planned vs Actual % (Manhour)" planned={s.plannedPctMh} actual={s.actualPctMh} />
        <Donut
          title="Time Elapsed vs Remaining"
          data={[
            { name: "Elapsed", value: elapsed, color: CORAL },
            { name: "Remaining", value: total - elapsed, color: TEAL },
          ]}
        />
        <Donut
          title={`Earned Value ${money(s.ev)} / Remaining ${money(s.bac - s.ev)}`}
          data={[
            { name: "Earned", value: s.ev, color: CORAL },
            { name: "Remaining", value: s.bac - s.ev, color: TEAL },
          ]}
        />
      </section>

      <section className="grid grid-cols-2 gap-3">
        <Card title="Progress Curve - Cost">
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={curve}>
                <CartesianGrid stroke="#3a3f52" vertical={false} />
                <XAxis dataKey="date" tickFormatter={monthLabel} stroke="#aaa" fontSize={11} minTickGap={40} />
                <YAxis stroke="#aaa" fontSize={11} unit="%" domain={[0, 100]} />
                <Tooltip labelFormatter={(l) => fmtDate(String(l))} formatter={(v) => `${Number(v).toFixed(2)}%`} contentStyle={{ background: "#2b2f3e", border: 0 }} />
                <Legend />
                <Area type="monotone" dataKey="planned" name="Planned %" stroke={TEAL} fill={TEAL} fillOpacity={0.5} />
                <Area type="monotone" dataKey="actual" name="Actual %" stroke={CORAL} fill={CORAL} fillOpacity={0.6} connectNulls={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Planned vs Actual % (Activity Wise)">
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={activityBars} layout="vertical" margin={{ left: 40 }}>
                <XAxis type="number" domain={[0, 100]} unit="%" stroke="#aaa" fontSize={11} />
                <YAxis type="category" dataKey="name" width={170} stroke="#ddd" fontSize={11} />
                <Tooltip formatter={(v) => `${v}%`} contentStyle={{ background: "#2b2f3e", border: 0 }} />
                <Legend />
                <Bar dataKey="Planned" fill={TEAL} barSize={8} />
                <Bar dataKey="Actual" fill={CORAL} barSize={8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Project Delay / Ahead Trend (Days)">
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={trend}>
                <CartesianGrid stroke="#3a3f52" vertical={false} />
                <XAxis dataKey="date" tickFormatter={monthLabel} stroke="#aaa" fontSize={11} minTickGap={40} />
                <YAxis stroke="#aaa" fontSize={11} />
                <Tooltip labelFormatter={(l) => fmtDate(String(l))} contentStyle={{ background: "#2b2f3e", border: 0 }} />
                <Line type="monotone" dataKey="delay" name="Delay (days)" stroke={TEAL} strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="max-h-80 overflow-auto">
          <WorkTable works={works} />
        </Card>
      </section>

      <section className="grid grid-cols-4 gap-3 text-sm">
        <Kpi label="BAC" value={money(s.bac)} />
        <Kpi label="EV / PV" value={`${money(s.ev)} / ${money(s.pv)}`} />
        <Kpi label="Actual Cost (AC)" value={money(s.ac)} />
        <Kpi label="CPI" value={s.cpi.toFixed(2)} bad={s.cpi < 1} />
      </section>
    </>
  );
}

export function WorkTable({ works }: { works: ReturnType<typeof byWork> }) {
  return (
    <table className="w-full text-sm">
      <thead className="sticky top-0 bg-[#6c6fc4] text-left">
        <tr>
          <th className="p-1.5">Type of Work</th>
          <th className="p-1.5">Early Planned %</th>
          <th className="p-1.5">Late Planned %</th>
          <th className="p-1.5">Actual %</th>
          <th className="p-1.5">Variance %</th>
        </tr>
      </thead>
      <tbody>
        {works.map((w) => (
          <tr key={w.name} className="border-b border-[#1f2230]">
            <td className={`p-1.5 ${w.variance < -0.0001 ? "bg-[#f26d6d]" : "bg-black"}`}>{w.name}</td>
            {[w.early, w.late, w.actual].map((v, i) => (
              <td key={i} className="relative p-1.5">
                <div className="absolute inset-y-1 left-0" style={{ width: `${v * 100}%`, background: AMBER }} />
                <span className="relative">{pct(v)}</span>
              </td>
            ))}
            <td className="p-1.5">
              <span className="mr-2 inline-block h-3 w-3 rounded-full" style={{ background: w.variance < -0.0001 ? CORAL : "#3bb273" }} />
              {pct(w.variance)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
