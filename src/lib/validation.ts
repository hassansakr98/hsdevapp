/**
 * Input control rules shared by manual entry and Excel import.
 * Errors block saving. Warnings need explicit confirmation from the engineer.
 */

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

export function checkProject(p: ProjectInput): CheckResult {
  const errors: Issue[] = [];
  if (!p.name.trim()) errors.push({ field: "name", message: "اسم المشروع مطلوب" });
  if (p.name.length > 120) errors.push({ field: "name", message: "اسم المشروع طويل كتير (120 حرف كحد أقصى)" });
  if (!isIsoDate(p.contractStart)) errors.push({ field: "contractStart", message: "تاريخ بداية العقد غير صالح" });
  if (!isIsoDate(p.contractFinish)) errors.push({ field: "contractFinish", message: "تاريخ نهاية العقد غير صالح" });
  if (isIsoDate(p.contractStart) && isIsoDate(p.contractFinish) && p.contractFinish <= p.contractStart)
    errors.push({ field: "contractFinish", message: "نهاية العقد لازم تكون بعد بدايته" });
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
): CheckResult {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  const E = (field: string, message: string) => errors.push({ field, message });
  const W = (field: string, message: string) => warnings.push({ field, message });

  if (!ID_RE.test(a.id)) E("id", "رمز النشاط مطلوب: أحرف إنجليزية وأرقام و - _ . / فقط، وحتى 30 حرف");
  else if (ctx.takenIds.has(a.id)) E("id", `الرمز "${a.id}" مستخدم لنشاط تاني`);
  if (!a.name.trim()) E("name", "اسم النشاط مطلوب");

  if (!Number.isFinite(a.budgetCost) || a.budgetCost <= 0) E("budgetCost", "الميزانية لازم تكون رقم أكبر من صفر");
  if (!Number.isFinite(a.budgetManhours) || a.budgetManhours < 0) E("budgetManhours", "ساعات العمل لازم تكون صفر أو أكتر");

  for (const k of ["earlyStart", "earlyFinish", "lateStart", "lateFinish"] as const) {
    if (!isIsoDate(a[k])) E(k, "تاريخ غير صالح");
  }
  if (errors.some((e) => e.field?.endsWith("Start") || e.field?.endsWith("Finish"))) return { errors, warnings };

  if (a.earlyFinish < a.earlyStart) E("earlyFinish", "Early Finish لازم يكون بعد Early Start أو بنفس اليوم");
  if (a.lateFinish < a.lateStart) E("lateFinish", "Late Finish لازم يكون بعد Late Start أو بنفس اليوم");
  if (a.lateStart < a.earlyStart) E("lateStart", "Late Start ما بيصير يكون قبل Early Start");
  if (a.lateFinish < a.earlyFinish) E("lateFinish", "Late Finish ما بيصير يكون قبل Early Finish");

  if (a.earlyStart < ctx.contractStart) W("earlyStart", "النشاط بيبلّش قبل بداية العقد");
  if (a.lateFinish > ctx.contractFinish) W("lateFinish", "النشاط بيخلص بعد نهاية العقد");
  if (a.budgetManhours === 0) W("budgetManhours", "ساعات العمل صفر: النشاط ما رح يأثر على منحنى الساعات");
  if (ctx.hasProgress) W("budgetCost", "النشاط إله تقدم مسجّل: تغيير الميزانية أو التواريخ بيغيّر كل الأرقام التاريخية");

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
): CheckResult {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];

  if (!isIsoDate(dataDate)) errors.push({ field: "dataDate", message: "Data Date غير صالح" });
  else {
    if (dataDate < ctx.contractStart) errors.push({ field: "dataDate", message: "Data Date قبل بداية العقد" });
    if (dataDate > todayIso()) errors.push({ field: "dataDate", message: "Data Date ما بيصير يكون بالمستقبل" });
    const last = ctx.existingDates.at(-1);
    if (last && dataDate < last && !ctx.existingDates.includes(dataDate))
      errors.push({
        field: "dataDate",
        message: `آخر تحديث مسجّل بتاريخ ${last}. التحديث الجديد لازم يكون بعده (أو اختار تاريخ موجود لتعديله)`,
      });
  }

  for (const r of rows) {
    const E = (m: string) => errors.push({ row: r.activityId, message: `${r.activityId}: ${m}` });
    const W = (m: string) => warnings.push({ row: r.activityId, message: `${r.activityId}: ${m}` });
    if (!Number.isFinite(r.pct) || r.pct < 0 || r.pct > 100) { E("نسبة الإنجاز لازم تكون بين 0 و 100"); continue; }
    if (!Number.isFinite(r.cost) || r.cost < 0) { E("التكلفة الفعلية لازم تكون صفر أو أكتر"); continue; }
    // cumulative values cannot go backwards
    if (r.pct < r.prevPct - 1e-9) E(`نسبة الإنجاز تراكمية: ما بتنزل عن ${r.prevPct}% (التحديث السابق)`);
    if (r.cost < r.prevCost - 1e-6) E(`التكلفة الفعلية تراكمية: ما بتنزل عن ${r.prevCost} (التحديث السابق)`);
    if (r.nextPct !== undefined && r.pct > r.nextPct + 1e-9) E(`أكبر من قيمة التحديث اللي بعده (${r.nextPct}%)`);
    if (r.nextCost !== undefined && r.cost > r.nextCost + 1e-6) E(`التكلفة أكبر من التحديث اللي بعده (${r.nextCost})`);

    if (r.pct === 0 && r.cost > 0) W("في تكلفة مصروفة بس الإنجاز 0%");
    if (r.pct > 0 && r.cost === 0) W("في إنجاز بس ما في تكلفة فعلية مسجلة (CPI رح يطلع غير منطقي)");
    if (r.pct - r.prevPct > 40) W(`قفزة كبيرة بالإنجاز: +${(r.pct - r.prevPct).toFixed(1)}% بتحديث واحد`);
    const earned = (r.pct / 100) * r.budgetCost;
    if (earned > 0 && r.cost > earned * 1.5) W("التكلفة الفعلية أكتر من 150% من القيمة المكتسبة");
    if (r.cost > r.budgetCost * 1.25) W("التكلفة الفعلية تجاوزت 125% من ميزانية النشاط");
    if (r.pct > 0 && isIsoDate(dataDate) && dataDate < r.earlyStart) W("مسجّل إنجاز قبل البداية المخططة (Early Start)");
  }
  return { errors, warnings };
}
