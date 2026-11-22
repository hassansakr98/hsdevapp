"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "./current-user";
import { parseWorkbook } from "./excel";
import { deleteProject, saveProject } from "./projects";
import { sampleProject } from "./sample";

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

  const id = saveProject(user.company_id, user.id, {
    name, contractStart: start, contractFinish: finish,
    dataDates: res.dataDates, activities: res.activities,
  });
  revalidatePath("/");
  redirect(`/projects/${id}`);
}

export async function createDemoProject() {
  const user = await requireUser();
  const p = sampleProject();
  const id = saveProject(user.company_id, user.id, { ...p, name: "Demo Project" });
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
