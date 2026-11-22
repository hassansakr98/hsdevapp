"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "./current-user";
import { getLang } from "./i18n-server";
import { makeTr } from "./i18n";
import { parseWorkbook } from "./excel";
import { deleteProject, logAudit, saveProject } from "./projects";
import { sampleProject } from "./sample";
import { checkActivity, todayIso } from "./validation";

export type ImportState = { errors?: string[] } | undefined;

const MAX_BYTES = 10 * 1024 * 1024;

export async function createProject(_: ImportState, form: FormData): Promise<ImportState> {
  const user = await requireUser();
  const lang = await getLang();
  const tr = makeTr(lang);
  const name = String(form.get("name") ?? "").trim();
  const file = form.get("file");
  let start = String(form.get("contractStart") ?? "");
  let finish = String(form.get("contractFinish") ?? "");

  if (!name) return { errors: [tr("اسم المشروع مطلوب", "Project name is required")] };
  if (!(file instanceof File) || file.size === 0) return { errors: [tr("اختار ملف Excel", "Choose an Excel file")] };
  if (file.size > MAX_BYTES) return { errors: [tr("حجم الملف أكبر من 10MB", "File is larger than 10MB")] };

  const res = await parseWorkbook(Buffer.from(await file.arrayBuffer()), lang);
  if (res.errors.length) return { errors: res.errors.slice(0, 20) };

  // Default contract dates to the schedule range if not given
  start ||= res.minDate;
  finish ||= res.maxDate;
  if (finish <= start) return { errors: [tr("تاريخ نهاية العقد لازم يكون بعد البداية", "Contract finish must be after the start")] };

  // Same control rules as manual entry
  const errors: string[] = [];
  for (const a of res.activities) {
    const { errors: e } = checkActivity(a, { contractStart: start, contractFinish: finish, takenIds: new Set() }, lang);
    for (const x of e) errors.push(`Activities · ${a.id}: ${x.message}`);
  }
  for (const a of res.activities) {
    let prevPct = 0, prevCost = 0, prevDate = "";
    for (const d of res.dataDates) {
      if (a.actualProgress[d] === undefined) continue;
      const pct = a.actualProgress[d], cost = a.actualCost[d] ?? 0;
      if (pct < prevPct - 1e-9) errors.push(`Progress · ${a.id} · ${d}: ` + tr(`الإنجاز نزل عن ${(prevPct * 100).toFixed(1)}% (${prevDate}). القيم لازم تكون تراكمية`, `progress dropped below ${(prevPct * 100).toFixed(1)}% (${prevDate}). Values must be cumulative`));
      if (cost < prevCost - 1e-6) errors.push(`Progress · ${a.id} · ${d}: ` + tr(`التكلفة نزلت عن ${prevCost} (${prevDate}). القيم لازم تكون تراكمية`, `cost dropped below ${prevCost} (${prevDate}). Values must be cumulative`));
      prevPct = pct; prevCost = cost; prevDate = d;
    }
  }
  if (res.dataDates.some((d) => d > todayIso())) errors.push(tr("في Data Date بالمستقبل بورقة Progress", "The Progress sheet has a data date in the future"));
  if (errors.length) return { errors: [...errors.slice(0, 20), ...(errors.length > 20 ? [tr(`و ${errors.length - 20} أخطاء كمان`, `and ${errors.length - 20} more errors`)] : [])] };

  const id = saveProject(user.company_id, user.id, {
    name, contractStart: start, contractFinish: finish,
    dataDates: res.dataDates, activities: res.activities,
  });
  logAudit(id, user, "project.import", `${file.name} · ${res.activities.length} activities · ${res.dataDates.length} data dates`);
  revalidatePath("/");
  redirect(`/projects/${id}`);
}

export async function createDemoProject() {
  const user = await requireUser();
  const tr = makeTr(await getLang());
  const p = sampleProject();
  const id = saveProject(user.company_id, user.id, { ...p, name: tr("مشروع تجريبي", "Demo project") });
  logAudit(id, user, "project.demo", `${p.activities.length} activities`);
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
