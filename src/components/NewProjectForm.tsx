"use client";

import { useActionState, useState } from "react";
import { createManualProject, type ActionState } from "@/lib/manual-actions";
import { createProject, type ImportState } from "@/lib/project-actions";
import { useTr } from "./LangProvider";
import { Card, Field, Issues, btn, cx, inputCls } from "./ui/kit";

export default function NewProjectForm() {
  const tr = useTr();
  const [mode, setMode] = useState<"manual" | "excel">("manual");
  const modes = [
    ["manual", tr("إدخال يدوي", "Manual entry"), tr("بتعمل المشروع وبتضيف الأنشطة والتقدم من جوا التطبيق", "Create the project and add activities and progress inside the app")],
    ["excel", tr("من ملف Excel", "From Excel"), tr("عندك بيانات جاهزة؟ نزّل القالب، عبّيه وارفعه", "Have data ready? Download the template, fill it and upload")],
  ] as const;
  return (
    <div className="max-w-2xl">
      <div className="mb-5 grid grid-cols-2 gap-3">
        {modes.map(([k, t, d]) => (
          <button
            key={k}
            type="button"
            onClick={() => setMode(k)}
            className={cx(
              "rounded-2xl border p-4 text-start transition",
              mode === k ? "border-brand bg-brand-soft ring-4 ring-brand/10" : "border-line bg-panel hover:border-brand",
            )}
          >
            <div className="font-semibold">{t}</div>
            <div className="mt-1 text-xs text-muted">{d}</div>
          </button>
        ))}
      </div>
      {mode === "manual" ? <ManualForm /> : <ExcelForm />}
    </div>
  );
}

function ManualForm() {
  const tr = useTr();
  const [state, action, pending] = useActionState<ActionState, FormData>(createManualProject, undefined);
  const v = state?.values;
  const err = (k: string) => state?.errors?.find((e) => e.field === k)?.message;
  return (
    <Card title={tr("بيانات المشروع", "Project details")}>
      <form action={action} className="space-y-4">
        <Field label={tr("اسم المشروع", "Project name")} required error={err("name")}>
          <input name="name" required defaultValue={v?.name} className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={tr("بداية العقد", "Contract start")} required error={err("contractStart")}>
            <input name="contractStart" type="date" required defaultValue={v?.contractStart} className={inputCls} />
          </Field>
          <Field label={tr("نهاية العقد", "Contract finish")} required error={err("contractFinish")}>
            <input name="contractFinish" type="date" required defaultValue={v?.contractFinish} className={inputCls} />
          </Field>
        </div>
        <button disabled={pending} className={btn("primary")}>
          {pending ? "…" : tr("إنشاء ومتابعة لإضافة الأنشطة", "Create and continue to activities")}
        </button>
      </form>
    </Card>
  );
}

function ExcelForm() {
  const tr = useTr();
  const [state, action, pending] = useActionState<ImportState, FormData>(createProject, undefined);
  return (
    <Card
      title={tr("استيراد من Excel", "Import from Excel")}
      actions={
        <div className="flex gap-3 text-xs">
          <a href="/template" className="font-medium text-brand hover:underline">{tr("القالب الفاضي", "Empty template")}</a>
          <a href="/template?example" className="font-medium text-brand hover:underline">{tr("قالب مع مثال", "Template with example")}</a>
        </div>
      }
    >
      <form action={action} className="space-y-4">
        <Field label={tr("اسم المشروع", "Project name")} required>
          <input name="name" required className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={tr("بداية العقد", "Contract start")} hint={tr("اختياري: بتنحسب من الأنشطة", "Optional: taken from activities")}>
            <input name="contractStart" type="date" className={inputCls} />
          </Field>
          <Field label={tr("نهاية العقد", "Contract finish")} hint={tr("اختياري", "Optional")}>
            <input name="contractFinish" type="date" className={inputCls} />
          </Field>
        </div>
        <Field
          label={tr("ملف Excel (.xlsx)", "Excel file (.xlsx)")}
          required
          hint={tr("الملف بيمرّ على نفس قواعد الرقابة تبع الإدخال اليدوي", "The file goes through the same checks as manual entry")}
        >
          <input
            name="file" type="file" required
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className={cx(inputCls, "file:me-3 file:rounded-lg file:border-0 file:bg-brand-soft file:px-3 file:py-1 file:text-brand")}
          />
        </Field>
        <Issues errors={state?.errors?.map((message) => ({ message }))} />
        <button disabled={pending} className={btn("primary")}>
          {pending ? tr("جاري الرفع والتحقق…", "Uploading and checking…") : tr("استيراد وإنشاء المشروع", "Import and create project")}
        </button>
      </form>
    </Card>
  );
}
