"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "./current-user";
import { parseWorkbook } from "./excel";
import { deleteProject, logAudit, saveProject } from "./projects";
import { sampleProject } from "./sample";
import { checkActivity, todayIso } from "./validation";

export type ImportState = { errors?: string[] } | undefined;

const MAX_BYTES = 10 * 1024 * 1024;

export async function createProject(_: ImportState, form: FormData): Promise<ImportState> {
  const user = await requireUser();
  const name = String(form.get("name") ?? "").trim();
  const file = form.get("file");
  let start = String(form.get("contractStart") ?? "");
  let finish = String(form.get("contractFinish") ?? "");

  if (!name) return { errors: ["اسم المشروع مطلوب"] };
  if (!(file instanceof File) || file.size === 0) return { errors: ["اختار ملف Excel"] };
  if (file.size > MAX_BYTES) return { errors: ["حجم الملف أكبر من 10MB"] };

  const res = await parseWorkbook(Buffer.from(await file.arrayBuffer()));
  if (res.errors.length) return { errors: res.errors.slice(0, 20) };

  // Default contract dates to the schedule range if not given
  start ||= res.minDate;
  finish ||= res.maxDate;
  if (finish <= start) return { errors: ["تاريخ نهاية العقد لازم يكون بعد البداية"] };

  // Same control rules as manual entry
  const errors: string[] = [];
  for (const a of res.activities) {
    const { errors: e } = checkActivity(a, { contractStart: start, contractFinish: finish, takenIds: new Set() });
    for (const x of e) errors.push(`Activities · ${a.id}: ${x.message}`);
  }
  for (const a of res.activities) {
    let prevPct = 0, prevCost = 0, prevDate = "";
    for (const d of res.dataDates) {
      if (a.actualProgress[d] === undefined) continue;
      const pct = a.actualProgress[d], cost = a.actualCost[d] ?? 0;
      if (pct < prevPct - 1e-9) errors.push(`Progress · ${a.id} · ${d}: الإنجاز نزل عن ${(prevPct * 100).toFixed(1)}% (${prevDate}). القيم لازم تكون تراكمية`);
      if (cost < prevCost - 1e-6) errors.push(`Progress · ${a.id} · ${d}: التكلفة نزلت عن ${prevCost} (${prevDate}). القيم لازم تكون تراكمية`);
      prevPct = pct; prevCost = cost; prevDate = d;
    }
  }
  if (res.dataDates.some((d) => d > todayIso())) errors.push("في Data Date بالمستقبل بورقة Progress");
  if (errors.length) return { errors: [...errors.slice(0, 20), ...(errors.length > 20 ? [`و ${errors.length - 20} أخطاء كمان`] : [])] };

  const id = saveProject(user.company_id, user.id, {
    name, contractStart: start, contractFinish: finish,
    dataDates: res.dataDates, activities: res.activities,
  });
  logAudit(id, user, "استيراد من Excel", `${file.name} · ${res.activities.length} نشاط · ${res.dataDates.length} تحديث`);
  revalidatePath("/");
  redirect(`/projects/${id}`);
}

export async function createDemoProject() {
  const user = await requireUser();
  const p = sampleProject();
  const id = saveProject(user.company_id, user.id, { ...p, name: "مشروع تجريبي" });
  logAudit(id, user, "إنشاء مشروع تجريبي", `${p.activities.length} نشاط`);
  revalidatePath("/");
  redirect(`/projects/${id}`);
}

export async function removeProject(form: FormData) {
  const user = await requireUser();
  if (user.role === "member") return; // only owner/admin can delete
  deleteProject(user.company_id, String(form.get("id")));
  revalidatePath("/");
  redirect("/");
}
