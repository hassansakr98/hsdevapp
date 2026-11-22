"use client";

import { useState } from "react";
import { cx } from "./kit";

/* ---------- KPI with formula explanation ---------- */

export interface Formula {
  /** e.g. "SPI = EV ÷ PV" */
  expr: string;
  /** e.g. "24.01M ÷ 26.56M = 0.904" */
  calc?: string;
  /** plain-language meaning */
  meaning?: string;
}

export function Stat({
  label, value, tone, formula, sub,
}: { label: string; value: React.ReactNode; tone?: "good" | "bad" | "warn"; formula?: Formula; sub?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative rounded-2xl border border-line bg-panel p-4">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted">
        <span className="ml-auto">{label}</span>
        {formula && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="grid h-5 w-5 place-items-center rounded-full border border-line text-[11px] text-muted hover:border-brand hover:text-brand"
            aria-label="طريقة الحساب"
            title="طريقة الحساب"
          >
            ؟
          </button>
        )}
      </div>
      <div className={cx(
        "num mt-2 text-right text-2xl font-bold",
        tone === "good" && "text-good", tone === "bad" && "text-bad", tone === "warn" && "text-warn",
      )}>
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
      {open && formula && (
        <div className="absolute inset-x-2 top-full z-20 mt-1 rounded-xl border border-line bg-panel p-3 text-xs shadow-xl">
          <div className="num rounded-lg bg-brand-soft px-2 py-1 text-left font-semibold text-brand">{formula.expr}</div>
          {formula.calc && <div className="num mt-1.5 rounded-lg bg-canvas px-2 py-1 text-left">{formula.calc}</div>}
          {formula.meaning && <p className="mt-2 leading-relaxed text-muted">{formula.meaning}</p>}
        </div>
      )}
    </div>
  );
}

