/**
 * Input control rules shared by manual entry and Excel import.
 * Errors block saving. Warnings need explicit confirmation from the engineer.
 * Messages come in the user's language (pass `lang`).
 */
import { makeTr, type Lang } from "./i18n";

export interface Issue {
  field?: string;
  row?: string; // activity id for grid rows
  message: string;
}
export interface CheckResult {
  errors: Issue[];
  warnings: Issue[];
}

export const ID_RE = /^[A-Za-z0-9._\-/]{1,30}$/;
const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

export const isIsoDate = (s: string) => ISO_RE.test(s) && !isNaN(new Date(s + "T00:00:00Z").getTime());
export const todayIso = () => new Date().toISOString().slice(0, 10);

export interface ProjectInput {
  name: string;
  contractStart: string;
  contractFinish: string;
}

export function checkProject(p: ProjectInput, lang: Lang = "ar"): CheckResult {
  const tr = makeTr(lang);
  const errors: Issue[] = [];
  if (!p.name.trim()) errors.push({ field: "name", message: tr("اسم المشروع مطلوب", "Project name is required") });
  if (p.name.length > 120) errors.push({ field: "name", message: tr("اسم المشروع طويل كتير (120 حرف كحد أقصى)", "Project name is too long (120 characters max)") });
  if (!isIsoDate(p.contractStart)) errors.push({ field: "contractStart", message: tr("تاريخ بداية العقد غير صالح", "Invalid contract start date") });
  if (!isIsoDate(p.contractFinish)) errors.push({ field: "contractFinish", message: tr("تاريخ نهاية العقد غير صالح", "Invalid contract finish date") });
  if (isIsoDate(p.contractStart) && isIsoDate(p.contractFinish) && p.contractFinish <= p.contractStart)
    errors.push({ field: "contractFinish", message: tr("نهاية العقد لازم تكون بعد بدايته", "Contract finish must be after its start") });
  return { errors, warnings: [] };
}

export interface ActivityInput {
  id: string;
  name: string;
  zone: string;
  floor: string;
  category: string;
  type: string;
  budgetCost: number;
  budgetManhours: number;
  earlyStart: string;
  earlyFinish: string;
  lateStart: string;
  lateFinish: string;
}

export function checkActivity(
  a: ActivityInput,
  ctx: { contractStart: string; contractFinish: string; takenIds: Set<string>; hasProgress?: boolean },
  lang: Lang = "ar",
): CheckResult {
  const tr = makeTr(lang);
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  const E = (field: string, message: string) => errors.push({ field, message });
  const W = (field: string, message: string) => warnings.push({ field, message });

  if (!ID_RE.test(a.id)) E("id", tr("رمز النشاط مطلوب: أحرف إنجليزية وأرقام و - _ . / فقط، وحتى 30 حرف", "Activity code is required: Latin letters, digits and - _ . / only, up to 30 characters"));
  else if (ctx.takenIds.has(a.id)) E("id", tr(`الرمز "${a.id}" مستخدم لنشاط تاني`, `Code "${a.id}" is already used by another activity`));
  if (!a.name.trim()) E("name", tr("اسم النشاط مطلوب", "Activity name is required"));

  if (!Number.isFinite(a.budgetCost) || a.budgetCost <= 0) E("budgetCost", tr("الميزانية لازم تكون رقم أكبر من صفر", "Budget must be a number greater than zero"));
  if (!Number.isFinite(a.budgetManhours) || a.budgetManhours < 0) E("budgetManhours", tr("ساعات العمل لازم تكون صفر أو أكتر", "Manhours must be zero or more"));

  for (const k of ["earlyStart", "earlyFinish", "lateStart", "lateFinish"] as const) {
    if (!isIsoDate(a[k])) E(k, tr("تاريخ غير صالح", "Invalid date"));
  }
  if (errors.some((e) => e.field?.endsWith("Start") || e.field?.endsWith("Finish"))) return { errors, warnings };

  if (a.earlyFinish < a.earlyStart) E("earlyFinish", tr("Early Finish لازم يكون بعد Early Start أو بنفس اليوم", "Early Finish must be on or after Early Start"));
  if (a.lateFinish < a.lateStart) E("lateFinish", tr("Late Finish لازم يكون بعد Late Start أو بنفس اليوم", "Late Finish must be on or after Late Start"));
  if (a.lateStart < a.earlyStart) E("lateStart", tr("Late Start ما بيصير يكون قبل Early Start", "Late Start can't be before Early Start"));
  if (a.lateFinish < a.earlyFinish) E("lateFinish", tr("Late Finish ما بيصير يكون قبل Early Finish", "Late Finish can't be before Early Finish"));

  if (a.earlyStart < ctx.contractStart) W("earlyStart", tr("النشاط بيبلّش قبل بداية العقد", "Activity starts before the contract start"));
  if (a.lateFinish > ctx.contractFinish) W("lateFinish", tr("النشاط بيخلص بعد نهاية العقد", "Activity finishes after the contract finish"));
  if (a.budgetManhours === 0) W("budgetManhours", tr("ساعات العمل صفر: النشاط ما رح يأثر على منحنى الساعات", "Zero manhours: the activity won't affect the manhour curve"));
  if (ctx.hasProgress) W("budgetCost", tr("النشاط إله تقدم مسجّل: تغيير الميزانية أو التواريخ بيغيّر كل الأرقام التاريخية", "This activity has recorded progress: changing budget or dates changes all historical figures"));

  return { errors, warnings };
}

export interface ProgressRow {
  activityId: string;
  activityName: string;
  budgetCost: number;
  earlyStart: string;
  pct: number; // 0..100
  cost: number;
  prevPct: number; // value at the previous data date (0..100)
  prevCost: number;
  nextPct?: number; // value at the following data date, if editing an older date
  nextCost?: number;
}

export function checkProgress(
  dataDate: string,
  rows: ProgressRow[],
  ctx: { contractStart: string; existingDates: string[] },
  lang: Lang = "ar",
): CheckResult {
  const tr = makeTr(lang);
  const errors: Issue[] = [];
  const warnings: Issue[] = [];

  if (!isIsoDate(dataDate)) errors.push({ field: "dataDate", message: tr("Data Date غير صالح", "Invalid data date") });
  else {
    if (dataDate < ctx.contractStart) errors.push({ field: "dataDate", message: tr("Data Date قبل بداية العقد", "Data date is before the contract start") });
    if (dataDate > todayIso()) errors.push({ field: "dataDate", message: tr("Data Date ما بيصير يكون بالمستقبل", "Data date can't be in the future") });
    const last = ctx.existingDates.at(-1);
    if (last && dataDate < last && !ctx.existingDates.includes(dataDate))
      errors.push({
        field: "dataDate",
        message: tr(
          `آخر تحديث مسجّل بتاريخ ${last}. التحديث الجديد لازم يكون بعده (أو اختار تاريخ موجود لتعديله)`,
          `The last recorded update is ${last}. A new update must be after it (or pick an existing date to edit it)`,
        ),
      });
  }

  for (const r of rows) {
    const E = (m: string) => errors.push({ row: r.activityId, message: `${r.activityId}: ${m}` });
    const W = (m: string) => warnings.push({ row: r.activityId, message: `${r.activityId}: ${m}` });
    if (!Number.isFinite(r.pct) || r.pct < 0 || r.pct > 100) { E(tr("نسبة الإنجاز لازم تكون بين 0 و 100", "Progress must be between 0 and 100")); continue; }
    if (!Number.isFinite(r.cost) || r.cost < 0) { E(tr("التكلفة الفعلية لازم تكون صفر أو أكتر", "Actual cost must be zero or more")); continue; }
    // cumulative values cannot go backwards
    if (r.pct < r.prevPct - 1e-9) E(tr(`نسبة الإنجاز تراكمية: ما بتنزل عن ${r.prevPct}% (التحديث السابق)`, `Progress is cumulative: it can't drop below ${r.prevPct}% (previous update)`));
    if (r.cost < r.prevCost - 1e-6) E(tr(`التكلفة الفعلية تراكمية: ما بتنزل عن ${r.prevCost} (التحديث السابق)`, `Actual cost is cumulative: it can't drop below ${r.prevCost} (previous update)`));
    if (r.nextPct !== undefined && r.pct > r.nextPct + 1e-9) E(tr(`أكبر من قيمة التحديث اللي بعده (${r.nextPct}%)`, `Higher than the following update (${r.nextPct}%)`));
    if (r.nextCost !== undefined && r.cost > r.nextCost + 1e-6) E(tr(`التكلفة أكبر من التحديث اللي بعده (${r.nextCost})`, `Cost is higher than the following update (${r.nextCost})`));

    if (r.pct === 0 && r.cost > 0) W(tr("في تكلفة مصروفة بس الإنجاز 0%", "Cost recorded but progress is 0%"));
    if (r.pct > 0 && r.cost === 0) W(tr("في إنجاز بس ما في تكلفة فعلية مسجلة (CPI رح يطلع غير منطقي)", "Progress recorded but no actual cost (CPI will be misleading)"));
    if (r.pct - r.prevPct > 40) W(tr(`قفزة كبيرة بالإنجاز: +${(r.pct - r.prevPct).toFixed(1)}% بتحديث واحد`, `Large jump in progress: +${(r.pct - r.prevPct).toFixed(1)}% in one update`));
    const earned = (r.pct / 100) * r.budgetCost;
    if (earned > 0 && r.cost > earned * 1.5) W(tr("التكلفة الفعلية أكتر من 150% من القيمة المكتسبة", "Actual cost is more than 150% of earned value"));
    if (r.cost > r.budgetCost * 1.25) W(tr("التكلفة الفعلية تجاوزت 125% من ميزانية النشاط", "Actual cost exceeds 125% of the activity budget"));
    if (r.pct > 0 && isIsoDate(dataDate) && dataDate < r.earlyStart) W(tr("مسجّل إنجاز قبل البداية المخططة (Early Start)", "Progress recorded before the planned start (Early Start)"));
  }
  return { errors, warnings };
}
