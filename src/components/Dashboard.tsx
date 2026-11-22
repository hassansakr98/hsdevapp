"use client";

import { useMemo, useState } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  addDays, byWork, daysBetween, delayDays, delayTrend, filterActivities, sCurve, snapshot,
} from "@/lib/calc";
import type { Filters, Project } from "@/lib/types";
import { logout } from "@/lib/auth";
import { removeProject } from "@/lib/project-actions";
import Link from "next/link";

const TEAL = "#2a9d8f";
const CORAL = "#f26d6d";
const AMBER = "#f4b942";

const pct = (v: number, d = 2) => `${(v * 100).toFixed(d)}%`;
const money = (v: number) =>
  v >= 1e6 ? `${(v / 1e6).toFixed(2)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(1)}K` : v.toFixed(0);
const fmtDate = (s: string) =>
  new Date(s + "T00:00:00Z").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit", timeZone: "UTC" }).replace(/ /g, "-");
const monthLabel = (s: string) =>
  new Date(s + "T00:00:00Z").toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });

const NAV = [
  "Dashboard", "Progress Curve - Cost", "Progress Curve - Manhour", "Progress Matrix",
  "Planned vs Actual Bars", "Activity Progress Trend %", "Activity Progress Trend EV",
  "Cost Variance Trend", "Delay / Ahead Trend", "Cost Variance Breakdown", "Earned Value Analysis",
];

function Card({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg bg-[#2b2f3e] p-3 ${className}`}>
      {title && <div className="-mx-3 -mt-3 mb-2 rounded-t-lg bg-[#6c6fc4] py-1.5 text-center text-lg font-medium text-white">{title}</div>}
      {children}
    </div>
  );
}

function Kpi({ label, value, bad }: { label: string; value: string; bad?: boolean }) {
  return (
    <div className="rounded-lg bg-[#2b2f3e] px-3 py-4 text-center">
      <div className="text-sm text-[#f4b942]">{label}</div>
      <div className={`mt-2 text-2xl font-semibold ${bad ? "text-[#f26d6d]" : "text-white"}`}>{value}</div>
    </div>
  );
}

function Gauge({ title, planned, actual }: { title: string; planned: number; actual: number }) {
  const data = [{ v: actual }, { v: Math.max(0, 1 - actual) }];
  return (
    <div className="rounded-lg bg-[#2b2f3e] p-3 text-center">
      <div className="text-sm text-[#f4b942]">{title}</div>
      <div className="relative h-28">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="v" startAngle={180} endAngle={0} cy="85%" innerRadius="95%" outerRadius="140%" stroke="none">
              <Cell fill={CORAL} />
              <Cell fill="#454a5c" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-x-0 bottom-3 text-xl text-white">{pct(actual)}</div>
      </div>
      <div className="flex justify-between text-xs text-gray-300">
        <span>0%</span>
        <span>Planned: {pct(planned)}</span>
        <span>100%</span>
      </div>
    </div>
  );
}

function Donut({ title, data }: { title: string; data: { name: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  return (
    <div className="rounded-lg bg-[#2b2f3e] p-3">
      <div className="text-center text-sm text-[#f4b942]">{title}</div>
      <div className="h-32">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius="55%" outerRadius="85%" stroke="none">
              {data.map((d) => <Cell key={d.name} fill={d.color} />)}
            </Pie>
            <Tooltip formatter={(v) => `${((Number(v) / total) * 100).toFixed(2)}%`} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-center gap-3 text-xs text-gray-300">
        {data.map((d) => (
          <span key={d.name} className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
            {d.name} {((d.value / total) * 100).toFixed(1)}%
          </span>
        ))}
      </div>
    </div>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col rounded-lg bg-[#2b2f3e] px-3 py-1.5 text-sm text-white">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 rounded border border-gray-400 bg-[#2b2f3e] px-1 py-0.5 text-[#2ec4b6]"
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

export default function Dashboard({
  project, user, canDelete = false,
}: { project: Project; user: { name: string; company: string }; canDelete?: boolean }) {
  const uniq = (k: "zone" | "floor" | "category" | "type") =>
    ["All", ...new Set(project.activities.map((a) => a[k]))];

  const [f, setF] = useState<Filters>({
    zone: "All", floor: "All", category: "All", type: "All",
    dataDate: project.dataDates[project.dataDates.length - 1] ?? project.contractStart,
  });
  const set = (k: keyof Filters) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  const m = useMemo(() => {
    const acts = filterActivities(project, f);
    const s = snapshot(project, acts, f.dataDate);
    const delay = delayDays(project, acts, f.dataDate);
    const total = daysBetween(project.contractStart, project.contractFinish);
    const elapsed = Math.min(total, Math.max(0, daysBetween(project.contractStart, f.dataDate)));
    return {
      s,
      delay,
      forecastFinish: addDays(project.contractFinish, -delay),
      elapsed,
      remaining: total - elapsed,
      curve: sCurve(project, acts, f.dataDate),
      trend: delayTrend(project, acts, f.dataDate),
      works: byWork(project, acts, f.dataDate),
    };
  }, [project, f]);

  const { s } = m;
  const activityBars = m.works
    .filter((w) => w.early > 0 && w.early < 1)
    .slice(0, 8)
    .map((w) => ({ name: w.name, Planned: +(w.early * 100).toFixed(2), Actual: +(w.actual * 100).toFixed(2) }));

  return (
    <div className="flex min-h-screen bg-[#1f2230] text-white">
      <aside className="flex w-52 shrink-0 flex-col gap-3 border-r-4 border-[#f4b942] p-4">
        <Link href="/" className="mb-2 rounded bg-white py-3 text-center text-lg font-bold text-[#1f2a5a]">hsdevapp</Link>
        <Link href="/" className="text-center text-sm text-[#2ec4b6] hover:underline">→ كل المشاريع</Link>
        {NAV.map((n, i) => (
          <button
            key={n}
            className={`rounded-lg px-2 py-2.5 text-sm ${i === 0 ? "bg-[#f26d6d] text-white" : "bg-[#2ec4b6] text-[#12303a] hover:brightness-110"}`}
          >
            {n}
          </button>
        ))}
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

      <main className="flex-1 space-y-3 p-4">
        <header className="flex flex-wrap items-center gap-3">
          <h1 className="mr-auto text-2xl font-semibold">{project.name}</h1>
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

        <section className="grid grid-cols-6 gap-3">
          <Kpi label="Contract Start" value={fmtDate(project.contractStart)} />
          <Kpi label="Contract Finish" value={fmtDate(project.contractFinish)} />
          <Kpi label="Forecasted Finish" value={fmtDate(m.forecastFinish)} bad={m.delay < 0} />
          <Kpi label="Delay/Ahead (Days)" value={String(m.delay)} bad={m.delay < 0} />
          <Kpi label="Variance %" value={pct(s.variancePct)} bad={s.variancePct < 0} />
          <Kpi label="SPI" value={s.spi.toFixed(2)} bad={s.spi < 1} />
        </section>

        <section className="grid grid-cols-4 gap-3">
          <Gauge title="Planned vs Actual % (Cost)" planned={s.plannedPct} actual={s.actualPct} />
          <Gauge title="Planned vs Actual % (Manhour)" planned={s.plannedPctMh} actual={s.actualPctMh} />
          <Donut
            title="Time Elapsed vs Remaining"
            data={[
              { name: "Elapsed", value: m.elapsed, color: CORAL },
              { name: "Remaining", value: m.remaining, color: TEAL },
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
                <AreaChart data={m.curve}>
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
                <LineChart data={m.trend}>
                  <CartesianGrid stroke="#3a3f52" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={monthLabel} stroke="#aaa" fontSize={11} minTickGap={40} />
                  <YAxis stroke="#aaa" fontSize={11} />
                  <Tooltip labelFormatter={(l) => fmtDate(String(l))} contentStyle={{ background: "#2b2f3e", border: 0 }} />
                  <Line type="monotone" dataKey="delay" name="Delay (days)" stroke={TEAL} strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="overflow-auto">
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
                {m.works.map((w) => (
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
          </Card>
        </section>

        <section className="grid grid-cols-4 gap-3 text-sm">
          <Kpi label="BAC" value={money(s.bac)} />
          <Kpi label="EV / PV" value={`${money(s.ev)} / ${money(s.pv)}`} />
          <Kpi label="Actual Cost (AC)" value={money(s.ac)} />
          <Kpi label="CPI" value={s.cpi.toFixed(2)} bad={s.cpi < 1} />
        </section>
      </main>
    </div>
  );
}
