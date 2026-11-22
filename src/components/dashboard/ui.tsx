"use client";

import type { Activity, Project } from "@/lib/types";
import { Card as KitCard, Stat, type Formula } from "../ui/kit";
export { fmtDate, money, monthLabel, pct } from "../ui/kit";

/** Props every analysis view receives: the project, filtered activities and selected data date */
export interface PageProps {
  project: Project;
  acts: Activity[];
  dataDate: string;
}

// Chart palette (matches globals.css tokens)
export const TEAL = "#6366f1";   // planned (early)
export const BLUE = "#a5b4fc";   // planned (late)
export const CORAL = "#f97316";  // actual / earned
export const AMBER = "#0ea5e9";  // actual cost, CPI, markers
export const GREEN = "#059669";  // favourable
export const BAD = "#e11d48";    // unfavourable
export const GRID = "#eef0f4";
export const tooltipStyle = {
  background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, boxShadow: "0 8px 24px rgba(15,23,42,.08)",
  direction: "ltr" as const, fontSize: 12,
};

export function Card({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return <KitCard title={title} className={className}>{children}</KitCard>;
}

export function Kpi({ label, value, bad, formula }: { label: string; value: string; bad?: boolean; formula?: Formula }) {
  return <Stat label={label} value={value} tone={bad ? "bad" : undefined} formula={formula} />;
}
