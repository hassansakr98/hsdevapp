"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { Activity, Project } from "@/lib/types";

/** Props every dashboard page receives: the project, filtered activities and selected data date */
export interface PageProps {
  project: Project;
  acts: Activity[];
  dataDate: string;
}

export const BLUE = "#6c6fc4";
export const GREEN = "#3bb273";
export const tooltipStyle = { background: "#2b2f3e", border: 0 };

export const TEAL = "#2a9d8f";
export const CORAL = "#f26d6d";
export const AMBER = "#f4b942";

export const pct = (v: number, d = 2) => `${(v * 100).toFixed(d)}%`;
export const money = (v: number): string => {
  const a = Math.abs(v), sign = v < 0 ? "-" : "";
  return sign + (a >= 1e6 ? `${(a / 1e6).toFixed(2)}M` : a >= 1e3 ? `${(a / 1e3).toFixed(1)}K` : a.toFixed(0));
};
export const fmtDate = (s: string) =>
  new Date(s + "T00:00:00Z").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit", timeZone: "UTC" }).replace(/ /g, "-");
export const monthLabel = (s: string) =>
  new Date(s + "T00:00:00Z").toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });

export function Card({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg bg-[#2b2f3e] p-3 ${className}`}>
      {title && <div className="-mx-3 -mt-3 mb-2 rounded-t-lg bg-[#6c6fc4] py-1.5 text-center text-lg font-medium text-white">{title}</div>}
      {children}
    </div>
  );
}

export function Kpi({ label, value, bad }: { label: string; value: string; bad?: boolean }) {
  return (
    <div className="rounded-lg bg-[#2b2f3e] px-3 py-4 text-center">
      <div className="text-sm text-[#f4b942]">{label}</div>
      <div className={`mt-2 text-2xl font-semibold ${bad ? "text-[#f26d6d]" : "text-white"}`}>{value}</div>
    </div>
  );
}

export function Gauge({ title, planned, actual }: { title: string; planned: number; actual: number }) {
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

export function Donut({ title, data }: { title: string; data: { name: string; value: number; color: string }[] }) {
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

export function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
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
