"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { actualAt, plannedAt } from "@/lib/calc";
import { removeDataDate, saveProgress, type ActionState } from "@/lib/manual-actions";
import type { Project } from "@/lib/types";
import { checkProgress, todayIso, type ProgressRow } from "@/lib/validation";
import { Badge, Card, Issues, btn, cx, fmtDate, inputCls, money, pct } from "./ui/kit";

type Entry = { pct: string; cost: string };

export default function ProgressEditor({ project, canDelete }: { project: Project; canDelete: boolean }) {
  const dates = project.dataDates;
  const [dataDate, setDataDate] = useState(todayIso());
  const [q, setQ] = useState("");
  const [onlyActive, setOnlyActive] = useState(true);
  const [state, action, pending] = useActionState<ActionState, FormData>(saveProgress, undefined);

  const isExisting = dates.includes(dataDate);
  const prevDate = [...dates].reverse().find((d) => d < dataDate);
  const nextDate = dates.find((d) => d > dataDate);

  // initial values: the value recorded at this date, otherwise carried forward from the previous update
  const initial = useMemo(() => {
    const m: Record<string, Entry> = {};
    for (const a of project.activities) {
      const src = isExisting ? dataDate : prevDate;
      const p = src ? actualAt(a, dates, src) : 0;
      const c = src ? costAt(a.actualCost, dates, src) : 0;
      m[a.id] = { pct: fmtNum(p * 100), cost: fmtNum(c) };
    }
    return m;
  }, [project, dataDate, isExisting, prevDate, dates]);

  const [entries, setEntries] = useState<Record<string, Entry>>(initial);
  const [baseKey, setBaseKey] = useState(dataDate);
  if (baseKey !== dataDate) { setBaseKey(dataDate); setEntries(initial); }

  const rows: (ProgressRow & { planned: number; changed: boolean })[] = project.activities.map((a) => {
    const e = entries[a.id] ?? initial[a.id];
    return {
      activityId: a.id,
      activityName: a.name,
      budgetCost: a.budgetCost,
      earlyStart: a.earlyStart,
      pct: e.pct === "" ? NaN : Number(e.pct),
      cost: e.cost === "" ? 0 : Number(e.cost),
      prevPct: prevDate ? +(actualAt(a, dates, prevDate) * 100).toFixed(4) : 0,
      prevCost: prevDate ? costAt(a.actualCost, dates, prevDate) : 0,
      nextPct: nextDate && a.actualProgress[nextDate] !== undefined ? +(a.actualProgress[nextDate] * 100).toFixed(4) : undefined,
      nextCost: nextDate ? a.actualCost[nextDate] : undefined,
      planned: plannedAt(a.earlyStart, a.earlyFinish, dataDate),
      changed: e.pct !== initial[a.id].pct || e.cost !== initial[a.id].cost,
    };
  });

  const check = useMemo(
    () => checkProgress(dataDate, rows, { contractStart: project.contractStart, existingDates: dates }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries, dataDate, project, dates],
  );
  const rowErr = (id: string) => check.errors.filter((e) => e.row === id);
  const rowWarn = (id: string) => check.warnings.filter((e) => e.row === id);
  const dateErr = check.errors.filter((e) => e.field === "dataDate");

  // live project totals for this update
  let bac = 0, pv = 0, ev = 0, ac = 0;
  for (const r of rows) {
    bac += r.budgetCost;
    pv += r.budgetCost * r.planned;
    ev += r.budgetCost * ((Number.isFinite(r.pct) ? r.pct : 0) / 100);
    ac += Number.isFinite(r.cost) ? r.cost : 0;
  }
  const spi = pv ? ev / pv : 1;
  const cpi = ac ? ev / ac : 1;

  const shown = rows.filter((r) => {
    if (q && !`${r.activityId} ${r.activityName}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (onlyActive && !q) {
      const done = r.prevPct >= 100 && r.pct >= 100;
      const notStarted = r.planned === 0 && r.pct === 0 && r.prevPct === 0;
      if ((done || notStarted) && !r.changed && rowErr(r.activityId).length === 0) return false;
    }
    return true;
  });
  const changedCount = rows.filter((r) => r.changed).length;
  const needsConfirm = state?.values?.confirm === "1" && !state.errors?.length && state.values.dataDate === dataDate;

  if (project.activities.length === 0) {
    return (
      <Card>
        <div className="py-10 text-center text-sm text-muted">
          لازم تضيف أنشطة قبل ما تسجّل التقدم.{" "}
          <Link href={`/projects/${project.id}/activities`} className="font-semibold text-brand underline">إضافة الأنشطة</Link>
        </div>
      </Card>
    );
  }

  const setE = (id: string, k: keyof Entry, val: string) =>
    setEntries((s) => ({ ...s, [id]: { ...(s[id] ?? initial[id]), [k]: val } }));

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="projectId" value={project.id} />
      <input type="hidden" name="dataDate" value={dataDate} />
      {needsConfirm && <input type="hidden" name="confirm" value="1" />}

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <Card title="تاريخ التحديث (Data Date)">
          <input type="date" value={dataDate} max={todayIso()} onChange={(e) => setDataDate(e.target.value)} className={inputCls} />
          {dateErr.map((e, i) => <p key={i} className="mt-2 text-xs text-bad">{e.message}</p>)}
          <div className="mt-3 text-xs text-muted">
            {isExisting ? (
              <Badge tone="warn">عم تعدّل تحديث موجود</Badge>
            ) : (
              <Badge tone="brand">تحديث جديد</Badge>
            )}
            {prevDate && <p className="mt-2">القيم معبّاية من التحديث السابق <span className="num font-semibold">{fmtDate(prevDate)}</span>. عدّل بس اللي تغيّر.</p>}
          </div>
          {dates.length > 0 && (
            <div className="mt-4">
              <div className="mb-1.5 text-xs font-medium text-muted">التحديثات المسجّلة ({dates.length})</div>
              <div className="flex max-h-32 flex-wrap gap-1.5 overflow-auto">
                {[...dates].reverse().map((d) => (
                  <button
                    type="button"
                    key={d}
                    onClick={() => setDataDate(d)}
                    className={cx("num rounded-lg border px-2 py-1 text-xs", d === dataDate ? "border-brand bg-brand-soft text-brand" : "border-line hover:border-brand")}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card title="النتيجة بعد هالتحديث" subtitle="بتتحدّث مباشرة وأنت عم تكتب">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Mini label="مخطط" value={pct(bac ? pv / bac : 0)} />
            <Mini label="فعلي" value={pct(bac ? ev / bac : 0)} tone={ev < pv ? "bad" : "good"} />
            <Mini label="SPI = EV ÷ PV" value={spi.toFixed(3)} sub={`${money(ev)} ÷ ${money(pv)}`} tone={spi < 1 ? "bad" : "good"} />
            <Mini label="CPI = EV ÷ AC" value={cpi.toFixed(3)} sub={`${money(ev)} ÷ ${money(ac)}`} tone={cpi < 1 ? "bad" : "good"} />
          </div>
        </Card>
      </div>

      <Card
        title="إنجاز الأنشطة"
        subtitle="Actual % تراكمي من 0 لـ 100 · التكلفة الفعلية تراكمية لحد Data Date"
        actions={
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-muted">
              <input type="checkbox" checked={onlyActive} onChange={(e) => setOnlyActive(e.target.checked)} />
              الأنشطة الجارية بس
            </label>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث…" className={cx(inputCls, "w-40 py-1.5")} />
          </div>
        }
        pad={false}
      >
        <div className="max-h-[60vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-xs text-muted">
              <tr>
                <th className="px-4 py-2 text-right font-medium">النشاط</th>
                <th className="px-3 py-2 text-left font-medium">مخطط اليوم</th>
                <th className="px-3 py-2 text-left font-medium">السابق</th>
                <th className="px-3 py-2 text-left font-medium">Actual %</th>
                <th className="px-3 py-2 text-left font-medium">التكلفة الفعلية</th>
                <th className="px-3 py-2 text-left font-medium">EV</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const errs = rowErr(r.activityId);
                const warns = rowWarn(r.activityId);
                const e = entries[r.activityId] ?? initial[r.activityId];
                return (
                  <tr key={r.activityId} className={cx("border-t border-line align-top", errs.length ? "bg-bad-soft/60" : r.changed && "bg-brand-soft/40")}>
                    <td className="px-4 py-2">
                      <div className="font-medium">{r.activityName}</div>
                      <div className="num text-right font-mono text-[11px] text-muted">{r.activityId}</div>
                      {[...errs, ...warns].map((x, i) => (
                        <div key={i} className={cx("mt-1 text-[11px]", i < errs.length ? "text-bad" : "text-warn")}>
                          {x.message.replace(`${r.activityId}: `, "")}
                        </div>
                      ))}
                    </td>
                    <td className="num px-3 py-2 text-left text-muted">{pct(r.planned, 1)}</td>
                    <td className="num px-3 py-2 text-left text-muted">{r.prevPct.toFixed(1)}%</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1" dir="ltr">
                        <input
                          name={`pct_${r.activityId}`}
                          value={e.pct}
                          onChange={(ev) => setE(r.activityId, "pct", ev.target.value)}
                          type="number" min={0} max={100} step="any"
                          className={cx(inputCls, "w-20 py-1 text-left")}
                          aria-invalid={errs.length > 0}
                        />
                        <span className="text-xs text-muted">%</span>
                        <button type="button" onClick={() => setE(r.activityId, "pct", "100")} className="rounded px-1 text-[10px] text-muted hover:bg-canvas" title="مكتمل">100</button>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        name={`cost_${r.activityId}`}
                        value={e.cost}
                        onChange={(ev) => setE(r.activityId, "cost", ev.target.value)}
                        type="number" min={0} step="any" dir="ltr"
                        className={cx(inputCls, "w-28 py-1 text-left")}
                        aria-invalid={errs.length > 0}
                      />
                    </td>
                    <td className="num px-3 py-2 text-left text-xs text-muted">{money(r.budgetCost * ((Number.isFinite(r.pct) ? r.pct : 0) / 100))}</td>
                    <td className="px-3 py-2 text-center">
                      {errs.length ? <span title="خطأ">⛔</span> : warns.length ? <span title="تحذير">⚠️</span> : r.changed ? <span className="text-brand">●</span> : null}
                    </td>
                  </tr>
                );
              })}
              {/* hidden inputs for rows filtered out of view so every activity is submitted */}
              {rows.filter((r) => !shown.includes(r)).map((r) => {
                const e = entries[r.activityId] ?? initial[r.activityId];
                return (
                  <tr key={r.activityId} className="hidden">
                    <td>
                      <input type="hidden" name={`pct_${r.activityId}`} value={e.pct} />
                      <input type="hidden" name={`cost_${r.activityId}`} value={e.cost} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {shown.length === 0 && <p className="p-6 text-center text-sm text-muted">ما في أنشطة جارية بهالتاريخ. شيل علامة «الأنشطة الجارية بس» لتشوف الكل.</p>}
        </div>
      </Card>

      <div className="sticky bottom-0 z-20 -mx-8 border-t border-line bg-panel/95 px-8 py-3 backdrop-blur">
        <Issues errors={state?.errors} warnings={state?.warnings} confirmable />
        {state?.ok && state.values?.dataDate === dataDate && changedCount === 0 && (
          <div className="mb-2 rounded-xl bg-good-soft p-2 text-sm text-good">✓ {state.message}</div>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button disabled={pending || check.errors.length > 0} className={btn("primary")}>
            {pending ? "جاري الحفظ…" : needsConfirm ? "تأكيد وحفظ التحديث" : isExisting ? "حفظ التعديلات" : "حفظ التحديث"}
          </button>
          <span className="text-sm text-muted">
            <span className="num">{changedCount}</span> نشاط متغيّر
          </span>
          {check.errors.length > 0 && <Badge tone="bad">{check.errors.length} خطأ</Badge>}
          {check.warnings.length > 0 && <Badge tone="warn">{check.warnings.length} تحذير</Badge>}
          {isExisting && canDelete && (
            <button
              formAction={removeDataDate}
              formNoValidate
              onClick={(e) => { if (!confirm(`حذف تحديث ${dataDate} بالكامل؟ ما بينفع نرجّعه.`)) e.preventDefault(); }}
              className={cx(btn("danger", "sm"), "mr-auto")}
            >
              حذف هالتحديث
            </button>
          )}
        </div>
      </div>
    </form>
  );
}

function Mini({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-xl bg-canvas p-3">
      <div className="num text-left text-[11px] text-muted">{label}</div>
      <div className={cx("num mt-1 text-left text-xl font-bold", tone === "good" && "text-good", tone === "bad" && "text-bad")}>{value}</div>
      {sub && <div className="num text-left text-[11px] text-muted">{sub}</div>}
    </div>
  );
}

function costAt(costs: Record<string, number>, dates: string[], date: string) {
  let v = 0;
  for (const d of dates) {
    if (d > date) break;
    if (costs[d] !== undefined) v = costs[d];
  }
  return v;
}

const fmtNum = (v: number) => String(+v.toFixed(4));
