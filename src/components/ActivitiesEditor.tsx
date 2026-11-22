"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { removeActivity, saveActivity, type ActionState } from "@/lib/manual-actions";
import type { Activity } from "@/lib/types";
import { checkActivity, type ActivityInput } from "@/lib/validation";
import { useLang, useTr } from "./LangProvider";
import { Badge, Card, Field, Issues, btn, cx, fmtDate, fullMoney, inputCls, money } from "./ui/kit";

type Meta = { id: string; contractStart: string; contractFinish: string };

const EMPTY: ActivityInput = {
  id: "", name: "", zone: "", floor: "", category: "", type: "",
  budgetCost: NaN, budgetManhours: 0, earlyStart: "", earlyFinish: "", lateStart: "", lateFinish: "",
};

const toForm = (a: ActivityInput) => ({
  ...a,
  budgetCost: Number.isFinite(a.budgetCost) ? String(a.budgetCost) : "",
  budgetManhours: String(a.budgetManhours ?? ""),
});

export default function ActivitiesEditor({
  meta, activities, withProgress,
}: { meta: Meta; activities: Activity[]; withProgress: string[] }) {
  const [editing, setEditing] = useState<{ originalId: string | null; values: ActivityInput } | null>(null);
  const [q, setQ] = useState("");
  const tr = useTr();

  const options = useMemo(() => {
    const u = (k: "zone" | "floor" | "category" | "type" | "name") =>
      [...new Set(activities.map((a) => a[k]).filter((v) => v && v !== "—"))].sort();
    return { zone: u("zone"), floor: u("floor"), category: u("category"), type: u("type"), name: u("name") };
  }, [activities]);

  const shown = activities
    .filter((a) => !q || `${a.id} ${a.name} ${a.zone} ${a.floor} ${a.category}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.earlyStart.localeCompare(b.earlyStart) || a.id.localeCompare(b.id));
  const totalBudget = activities.reduce((s, a) => s + a.budgetCost, 0);

  const nextId = () => {
    const nums = activities.map((a) => Number(a.id.replace(/\D/g, ""))).filter(Number.isFinite);
    return `A${(nums.length ? Math.max(...nums) : 0) + 1}`;
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
      <Card
        title={`${tr("الأنشطة", "Activities")} (${activities.length})`}
        subtitle={<>{tr("إجمالي الميزانية", "Total budget")} <span className="num font-semibold text-ink">{fullMoney(totalBudget)}</span></>}
        actions={
          <div className="flex gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("بحث…", "Search…")} className={cx(inputCls, "w-44 py-1.5")} />
            <button className={btn("primary")} onClick={() => setEditing({ originalId: null, values: { ...EMPTY, id: nextId() } })}>
              + {tr("نشاط", "Activity")}
            </button>
          </div>
        }
        pad={false}
      >
        {activities.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted">
            {tr("ما في أنشطة. اكبس «+ نشاط» لتضيف أول نشاط.", "No activities yet. Press “+ Activity” to add the first one.")}
          </div>
        ) : (
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-xs text-muted">
                <tr>
                  <th className="px-4 py-2 text-start font-medium">{tr("الرمز", "Code")}</th>
                  <th className="px-3 py-2 text-start font-medium">{tr("النشاط", "Activity")}</th>
                  <th className="px-3 py-2 text-start font-medium">{tr("الموقع", "Location")}</th>
                  <th className="px-3 py-2 text-end font-medium">{tr("الميزانية", "Budget")}</th>
                  <th className="px-3 py-2 text-end font-medium">{tr("الوزن", "Weight")}</th>
                  <th className="px-3 py-2 text-end font-medium">Early</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {shown.map((a) => (
                  <tr key={a.id} className={cx("border-t border-line hover:bg-canvas", editing?.originalId === a.id && "bg-brand-soft")}>
                    <td className="num px-4 py-2 text-start font-mono text-xs">{a.id}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{a.name}</div>
                      <div className="text-xs text-muted">{a.category} · {a.type}</div>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted">{a.zone} · {a.floor}</td>
                    <td className="num px-3 py-2 text-end">{money(a.budgetCost)}</td>
                    <td className="num px-3 py-2 text-end text-xs text-muted">{totalBudget ? ((a.budgetCost / totalBudget) * 100).toFixed(2) : 0}%</td>
                    <td className="num px-3 py-2 text-end text-xs">{fmtDate(a.earlyStart)} → {fmtDate(a.earlyFinish)}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-end">
                      <button className="px-1.5 text-xs text-brand hover:underline" onClick={() => setEditing({ originalId: a.id, values: a })}>{tr("تعديل", "Edit")}</button>
                      <button
                        className="px-1.5 text-xs text-muted hover:underline"
                        onClick={() => setEditing({ originalId: null, values: { ...a, id: nextId() } })}
                        title={tr("نسخ النشاط لطابق أو منطقة تانية", "Copy the activity to another floor or zone")}
                      >
                        {tr("نسخ", "Copy")}
                      </button>
                      <form
                        action={removeActivity}
                        className="inline"
                        onSubmit={(e) => {
                          const extra = withProgress.includes(a.id) ? "\n" + tr("تنبيه: النشاط إله تقدم مسجّل، ورح ينحذف معه.", "Note: this activity has recorded progress, which will be deleted too.") : "";
                          if (!confirm(`${tr("حذف النشاط", "Delete activity")} ${a.id} (${a.name})?${extra}`)) e.preventDefault();
                        }}
                      >
                        <input type="hidden" name="projectId" value={meta.id} />
                        <input type="hidden" name="activityId" value={a.id} />
                        <button className="px-1.5 text-xs text-bad hover:underline">{tr("حذف", "Delete")}</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {editing ? (
        <ActivityForm
          key={`${editing.originalId ?? "new"}-${editing.values.id}`}
          meta={meta}
          originalId={editing.originalId}
          initial={editing.values}
          takenIds={activities.map((a) => a.id)}
          hasProgress={!!editing.originalId && withProgress.includes(editing.originalId)}
          options={options}
          onDone={() => setEditing(null)}
        />
      ) : (
        <Card title={tr("كيف بتنحسب الأوزان؟", "How are weights calculated?")}>
          <div className="space-y-3 text-sm leading-relaxed text-slate-600">
            <p>{tr("كل نشاط وزنه بالمشروع = ميزانيته ÷ مجموع الميزانيات. لهيك النشاط الأغلى بيأثر أكتر على نسبة الإنجاز الكلية.", "Each activity's weight = its budget ÷ total budget, so costlier activities affect overall progress more.")}</p>
            <p>{tr("المخطط بيتوزع خطياً بين Early Start وEarly Finish. مثلاً نشاط مدته 10 أيام، بعد 4 أيام بيكون مخططه 40%.", "Planned progress is spread linearly between Early Start and Early Finish. E.g. a 10-day activity is 40% planned after 4 days.")}</p>
            <p>{tr("Late dates بتُستخدم لرسم الحد المتأخر بالمنحنى. إذا ما عندك ياها، اتركها فاضية وبتاخد قيم Early.", "Late dates draw the late boundary on the curve. If you don't have them, leave them empty and Early values are used.")}</p>
            <p className="rounded-xl bg-canvas p-3 text-xs">
              {tr("رقابة الإدخال: ما بينحفظ نشاط إذا الرمز مكرر، أو الميزانية صفر، أو التواريخ متعاكسة، أو Late قبل Early. والتحذيرات (متل نشاط برا مدة العقد) بدها تأكيد منك.", "Input checks: an activity won't save with a duplicate code, zero budget, reversed dates, or Late before Early. Warnings (like an activity outside the contract) need your confirmation.")}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}

function ActivityForm({
  meta, originalId, initial, takenIds, hasProgress, options, onDone,
}: {
  meta: Meta; originalId: string | null; initial: ActivityInput; takenIds: string[]; hasProgress: boolean;
  options: Record<"zone" | "floor" | "category" | "type" | "name", string[]>; onDone: () => void;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveActivity, undefined);
  const tr = useTr();
  const lang = useLang();
  const [v, setV] = useState(toForm(initial));
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV((s) => ({ ...s, [k]: e.target.value }));

  useEffect(() => { if (state?.ok) onDone(); }, [state, onDone]);

  // live check with the same rules the server uses
  const live = useMemo(() => {
    const taken = new Set(takenIds);
    if (originalId) taken.delete(originalId);
    return checkActivity(
      {
        ...v,
        budgetCost: v.budgetCost === "" ? NaN : Number(v.budgetCost),
        budgetManhours: v.budgetManhours === "" ? 0 : Number(v.budgetManhours),
        lateStart: v.lateStart || v.earlyStart,
        lateFinish: v.lateFinish || v.earlyFinish,
      },
      { contractStart: meta.contractStart, contractFinish: meta.contractFinish, takenIds: taken, hasProgress },
      lang,
    );
  }, [v, takenIds, originalId, meta, hasProgress, lang]);
  const touched = (k: string) => (v as Record<string, string>)[k] !== "";
  const err = (k: string) => (touched(k) || state?.errors ? live.errors.find((e) => e.field === k)?.message : undefined);
  const warn = (k: string) => live.warnings.find((e) => e.field === k)?.message;
  const needsConfirm = state?.values?.confirm === "1" && !state.errors?.length;

  const dl = (k: keyof typeof options) => (
    <datalist id={`dl-${k}`}>{options[k].map((o) => <option key={o} value={o} />)}</datalist>
  );

  return (
    <Card
      title={originalId ? `${tr("تعديل", "Edit")} ${originalId}` : tr("نشاط جديد", "New activity")}
      actions={<button onClick={onDone} className="text-xs text-muted hover:text-ink">{tr("إلغاء", "Cancel")} ✕</button>}
      className="xl:sticky xl:top-4 xl:self-start"
    >
      <form action={action} className="space-y-4">
        <input type="hidden" name="projectId" value={meta.id} />
        <input type="hidden" name="originalId" value={originalId ?? ""} />
        {needsConfirm && <input type="hidden" name="confirm" value="1" />}

        <div className="grid grid-cols-[120px_1fr] gap-3">
          <Field label={tr("الرمز", "Code")} required error={err("id")}>
            <input name="id" value={v.id} onChange={set("id")} dir="ltr" className={inputCls} aria-invalid={!!err("id")} />
          </Field>
          <Field label={tr("اسم النشاط", "Activity name")} required error={err("name")} hint={tr("الاسم نفسه بيجمع الأنشطة بـ «نوع العمل»", "Same name groups activities into a type of work")}>
            <input name="name" value={v.name} onChange={set("name")} list="dl-name" className={inputCls} aria-invalid={!!err("name")} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Zone"><input name="zone" value={v.zone} onChange={set("zone")} list="dl-zone" className={inputCls} /></Field>
          <Field label={tr("الطابق", "Floor")}><input name="floor" value={v.floor} onChange={set("floor")} list="dl-floor" className={inputCls} /></Field>
          <Field label={tr("التصنيف", "Category")}><input name="category" value={v.category} onChange={set("category")} list="dl-category" className={inputCls} /></Field>
          <Field label={tr("النوع", "Type")}><input name="type" value={v.type} onChange={set("type")} list="dl-type" className={inputCls} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={tr("الميزانية", "Budget")} required error={err("budgetCost")} warning={warn("budgetCost")}>
            <input name="budgetCost" value={v.budgetCost} onChange={set("budgetCost")} type="number" min="0" step="any" dir="ltr" className={inputCls} aria-invalid={!!err("budgetCost")} />
          </Field>
          <Field label={tr("ساعات العمل", "Manhours")} error={err("budgetManhours")} warning={warn("budgetManhours")}>
            <input name="budgetManhours" value={v.budgetManhours} onChange={set("budgetManhours")} type="number" min="0" step="any" dir="ltr" className={inputCls} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Early Start" required error={err("earlyStart")} warning={warn("earlyStart")}>
            <input name="earlyStart" value={v.earlyStart} onChange={set("earlyStart")} type="date" className={inputCls} aria-invalid={!!err("earlyStart")} />
          </Field>
          <Field label="Early Finish" required error={err("earlyFinish")}>
            <input name="earlyFinish" value={v.earlyFinish} onChange={set("earlyFinish")} type="date" className={inputCls} aria-invalid={!!err("earlyFinish")} />
          </Field>
          <Field label="Late Start" error={v.lateStart ? err("lateStart") : undefined} hint={tr("فاضي = نفس Early", "Empty = same as Early")}>
            <input name="lateStart" value={v.lateStart} onChange={set("lateStart")} type="date" className={inputCls} />
          </Field>
          <Field label="Late Finish" error={v.lateFinish ? err("lateFinish") : undefined} warning={warn("lateFinish")}>
            <input name="lateFinish" value={v.lateFinish} onChange={set("lateFinish")} type="date" className={inputCls} />
          </Field>
        </div>
        {dl("name")}{dl("zone")}{dl("floor")}{dl("category")}{dl("type")}

        <Issues errors={state?.errors} warnings={state?.warnings} confirmable />

        <div className="flex items-center gap-2">
          <button disabled={pending || live.errors.length > 0} className={btn("primary")}>
            {pending ? tr("جاري الحفظ…", "Saving…") : needsConfirm ? tr("تأكيد وحفظ", "Confirm and save") : tr("حفظ النشاط", "Save activity")}
          </button>
          {live.errors.length > 0 && <Badge tone="bad">{live.errors.length} {tr("خطأ لازم يتصحح", "errors to fix")}</Badge>}
          {live.errors.length === 0 && live.warnings.length > 0 && <Badge tone="warn">{live.warnings.length} {tr("تحذير", "warnings")}</Badge>}
        </div>
      </form>
    </Card>
  );
}
