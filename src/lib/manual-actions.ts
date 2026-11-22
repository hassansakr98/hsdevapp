"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actualAt } from "./calc";
import { requireUser } from "./current-user";
import {
  activityHasProgress, activityIds, createEmptyProject, deleteActivity, deleteDataDate, getProject,
  getProjectMeta, logAudit, saveProgressRows, updateProjectMeta, upsertActivity,
} from "./projects";
import { checkActivity, checkProgress, checkProject, type Issue, type ProgressRow } from "./validation";

export type ActionState =
  | { ok?: boolean; errors?: Issue[]; warnings?: Issue[]; message?: string; values?: Record<string, string> }
  | undefined;

const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const n = (f: FormData, k: string) => {
  const v = s(f, k).replace(/,/g, "");
  return v === "" ? NaN : Number(v);
};
const valuesOf = (f: FormData) =>
  Object.fromEntries([...f.entries()].filter(([, v]) => typeof v === "string")) as Record<string, string>;

async function projectFor(projectId: string) {
  const user = await requireUser();
  const meta = getProjectMeta(user.company_id, projectId);
  if (!meta) throw new Error("Project not found");
  return { user, meta };
}

/* ---------- project ---------- */

export async function createManualProject(_: ActionState, f: FormData): Promise<ActionState> {
  const user = await requireUser();
  const p = { name: s(f, "name"), contractStart: s(f, "contractStart"), contractFinish: s(f, "contractFinish") };
  const { errors } = checkProject(p);
  if (errors.length) return { errors, values: valuesOf(f) };
  const id = createEmptyProject(user.company_id, user.id, p);
  logAudit(id, user, "إنشاء المشروع", `${p.contractStart} → ${p.contractFinish}`);
  revalidatePath("/");
  redirect(`/projects/${id}/activities`);
}

export async function saveProjectSettings(_: ActionState, f: FormData): Promise<ActionState> {
  const { user, meta } = await projectFor(s(f, "projectId"));
  const p = { name: s(f, "name"), contractStart: s(f, "contractStart"), contractFinish: s(f, "contractFinish") };
  const { errors } = checkProject(p);
  if (errors.length) return { errors, values: valuesOf(f) };
  updateProjectMeta(meta.id, p);
  logAudit(meta.id, user, "تعديل بيانات المشروع",
    `${meta.name} (${meta.contract_start} → ${meta.contract_finish}) ⟵ ${p.name} (${p.contractStart} → ${p.contractFinish})`);
  revalidatePath(`/projects/${meta.id}`, "layout");
  return { ok: true, message: "انحفظت بيانات المشروع" };
}

/* ---------- activities ---------- */

export async function saveActivity(_: ActionState, f: FormData): Promise<ActionState> {
  const { user, meta } = await projectFor(s(f, "projectId"));
  const originalId = s(f, "originalId") || null;
  const a = {
    id: s(f, "id"),
    name: s(f, "name"),
    zone: s(f, "zone") || "—",
    floor: s(f, "floor") || "—",
    category: s(f, "category") || "—",
    type: s(f, "type") || "—",
    budgetCost: n(f, "budgetCost"),
    budgetManhours: s(f, "budgetManhours") === "" ? 0 : n(f, "budgetManhours"),
    earlyStart: s(f, "earlyStart"),
    earlyFinish: s(f, "earlyFinish"),
    lateStart: s(f, "lateStart") || s(f, "earlyStart"),
    lateFinish: s(f, "lateFinish") || s(f, "earlyFinish"),
  };
  const taken = new Set(activityIds(meta.id));
  if (originalId) taken.delete(originalId);
  const { errors, warnings } = checkActivity(a, {
    contractStart: meta.contract_start,
    contractFinish: meta.contract_finish,
    takenIds: taken,
    hasProgress: originalId ? activityHasProgress(meta.id, originalId) : false,
  });
  if (errors.length) return { errors, warnings, values: valuesOf(f) };
  if (warnings.length && f.get("confirm") !== "1") return { warnings, values: { ...valuesOf(f), confirm: "1" } };

  upsertActivity(meta.id, originalId, a);
  logAudit(meta.id, user, originalId ? "تعديل نشاط" : "إضافة نشاط",
    `${a.id} · ${a.name} · ميزانية ${a.budgetCost} · ${a.earlyStart} → ${a.earlyFinish}`);
  revalidatePath(`/projects/${meta.id}`, "layout");
  return { ok: true, message: originalId ? `انحفظ النشاط ${a.id}` : `انضاف النشاط ${a.id}` };
}

export async function removeActivity(f: FormData) {
  const { user, meta } = await projectFor(s(f, "projectId"));
  const id = s(f, "activityId");
  deleteActivity(meta.id, id);
  logAudit(meta.id, user, "حذف نشاط", id);
  revalidatePath(`/projects/${meta.id}`, "layout");
}

/* ---------- progress ---------- */

export async function saveProgress(_: ActionState, f: FormData): Promise<ActionState> {
  const { user, meta } = await projectFor(s(f, "projectId"));
  const project = getProject(user.company_id, meta.id)!;
  const dataDate = s(f, "dataDate");
  const dates = project.dataDates;
  const prevDate = [...dates].reverse().find((d) => d < dataDate);
  const nextDate = dates.find((d) => d > dataDate);

  const rows: ProgressRow[] = [];
  for (const a of project.activities) {
    if (!f.has(`pct_${a.id}`)) continue;
    const pctRaw = s(f, `pct_${a.id}`);
    const costRaw = s(f, `cost_${a.id}`);
    rows.push({
      activityId: a.id,
      activityName: a.name,
      budgetCost: a.budgetCost,
      earlyStart: a.earlyStart,
      pct: pctRaw === "" ? NaN : Number(pctRaw),
      cost: costRaw === "" ? 0 : Number(costRaw.replace(/,/g, "")),
      prevPct: prevDate ? +(actualAt(a, dates, prevDate) * 100).toFixed(4) : 0,
      prevCost: prevDate ? a.actualCost[prevDate] ?? 0 : 0,
      nextPct: nextDate && a.actualProgress[nextDate] !== undefined ? +(a.actualProgress[nextDate] * 100).toFixed(4) : undefined,
      nextCost: nextDate ? a.actualCost[nextDate] : undefined,
    });
  }
  if (rows.length === 0) return { errors: [{ message: "ما في أنشطة لتحديثها. ضيف أنشطة أول" }] };

  const { errors, warnings } = checkProgress(dataDate, rows, { contractStart: meta.contract_start, existingDates: dates });
  if (errors.length) return { errors, warnings, values: valuesOf(f) };
  if (warnings.length && f.get("confirm") !== "1") return { warnings, values: { ...valuesOf(f), confirm: "1" } };

  saveProgressRows(meta.id, dataDate, rows.map((r) => ({ activityId: r.activityId, pct: r.pct / 100, cost: r.cost })), user.id);
  const isNew = !dates.includes(dataDate);
  logAudit(meta.id, user, isNew ? "تحديث تقدم جديد" : "تعديل تحديث تقدم",
    `Data Date ${dataDate} · ${rows.length} نشاط${warnings.length ? ` · ${warnings.length} تحذير مؤكَّد` : ""}`);
  revalidatePath(`/projects/${meta.id}`, "layout");
  return { ok: true, message: `انحفظ تحديث ${dataDate} لـ ${rows.length} نشاط`, values: { dataDate } };
}

export async function removeDataDate(f: FormData) {
  const { user, meta } = await projectFor(s(f, "projectId"));
  const d = s(f, "dataDate");
  deleteDataDate(meta.id, d);
  logAudit(meta.id, user, "حذف تحديث تقدم", `Data Date ${d}`);
  revalidatePath(`/projects/${meta.id}`, "layout");
  redirect(`/projects/${meta.id}/progress`);
}
