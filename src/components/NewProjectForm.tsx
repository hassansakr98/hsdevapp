"use client";

import { useActionState, useState } from "react";
import { createManualProject, type ActionState } from "@/lib/manual-actions";
import { createProject, type ImportState } from "@/lib/project-actions";
import { Card, Field, Issues, btn, cx, inputCls } from "./ui/kit";

export default function NewProjectForm() {
  const [mode, setMode] = useState<"manual" | "excel">("manual");
  return (
    <div className="max-w-2xl">
      <div className="mb-5 grid grid-cols-2 gap-3">
        {([
          ["manual", "إدخال يدوي", "بتعمل المشروع وبتضيف الأنشطة والتقدم من جوا التطبيق"],
          ["excel", "من ملف Excel", "عندك بيانات جاهزة؟ نزّل القالب، عبّيه وارفعه"],
        ] as const).map(([k, t, d]) => (
          <button
            key={k}
            type="button"
            onClick={() => setMode(k)}
            className={cx(
              "rounded-2xl border p-4 text-right transition",
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
  const [state, action, pending] = useActionState<ActionState, FormData>(createManualProject, undefined);
  const v = state?.values;
  const err = (k: string) => state?.errors?.find((e) => e.field === k)?.message;
  return (
    <Card title="بيانات المشروع">
      <form action={action} className="space-y-4">
        <Field label="اسم المشروع" required error={err("name")}>
          <input name="name" required defaultValue={v?.name} className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="بداية العقد" required error={err("contractStart")}>
            <input name="contractStart" type="date" required defaultValue={v?.contractStart} className={inputCls} />
          </Field>
          <Field label="نهاية العقد" required error={err("contractFinish")}>
            <input name="contractFinish" type="date" required defaultValue={v?.contractFinish} className={inputCls} />
          </Field>
        </div>
        <button disabled={pending} className={btn("primary")}>{pending ? "…" : "إنشاء ومتابعة لإضافة الأنشطة"}</button>
      </form>
    </Card>
  );
}

function ExcelForm() {
  const [state, action, pending] = useActionState<ImportState, FormData>(createProject, undefined);
  return (
    <Card
      title="استيراد من Excel"
      actions={
        <div className="flex gap-3 text-xs">
          <a href="/template" className="font-medium text-brand hover:underline">القالب الفاضي</a>
          <a href="/template?example" className="font-medium text-brand hover:underline">قالب مع مثال</a>
        </div>
      }
    >
      <form action={action} className="space-y-4">
        <Field label="اسم المشروع" required>
          <input name="name" required className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="بداية العقد" hint="اختياري: بتنحسب من الأنشطة">
            <input name="contractStart" type="date" className={inputCls} />
          </Field>
          <Field label="نهاية العقد" hint="اختياري">
            <input name="contractFinish" type="date" className={inputCls} />
          </Field>
        </div>
        <Field label="ملف Excel (.xlsx)" required hint="الملف بيمرّ على نفس قواعد الرقابة تبع الإدخال اليدوي">
          <input
            name="file" type="file" required
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className={cx(inputCls, "file:ml-3 file:rounded-lg file:border-0 file:bg-brand-soft file:px-3 file:py-1 file:text-brand")}
          />
        </Field>
        <Issues errors={state?.errors?.map((message) => ({ message }))} />
        <button disabled={pending} className={btn("primary")}>{pending ? "جاري الرفع والتحقق…" : "استيراد وإنشاء المشروع"}</button>
      </form>
    </Card>
  );
}
