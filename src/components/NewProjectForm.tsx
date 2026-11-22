"use client";

import { useActionState } from "react";
import { createProject, type ImportState } from "@/lib/project-actions";

const input =
  "w-full rounded-lg border border-[#454a5c] bg-[#1f2230] px-3 py-2 text-white outline-none focus:border-[#2ec4b6]";

export default function NewProjectForm() {
  const [state, action, pending] = useActionState<ImportState, FormData>(createProject, undefined);

  return (
    <form action={action} className="space-y-4 rounded-xl bg-[#2b2f3e] p-6">
      <label className="block space-y-1 text-sm">
        <span>اسم المشروع</span>
        <input name="name" required className={input} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1 text-sm">
          <span>بداية العقد <span className="text-gray-400">(اختياري)</span></span>
          <input name="contractStart" type="date" className={input} />
        </label>
        <label className="block space-y-1 text-sm">
          <span>نهاية العقد <span className="text-gray-400">(اختياري)</span></span>
          <input name="contractFinish" type="date" className={input} />
        </label>
      </div>
      <p className="text-xs text-gray-400">إذا تركت التواريخ فاضية، بنحسبها من أول وآخر تاريخ بالأنشطة.</p>

      <label className="block space-y-1 text-sm">
        <span>ملف Excel</span>
        <input
          name="file"
          type="file"
          required
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className={`${input} file:ml-3 file:rounded file:border-0 file:bg-[#2ec4b6] file:px-3 file:py-1 file:text-[#12303a]`}
        />
      </label>

      {state?.errors && (
        <ul className="space-y-1 rounded-lg bg-[#f26d6d]/15 p-3 text-sm text-[#f26d6d]">
          {state.errors.map((e, i) => <li key={i}>• {e}</li>)}
        </ul>
      )}

      <button
        disabled={pending}
        className="w-full rounded-lg bg-[#2ec4b6] py-2 font-semibold text-[#12303a] hover:brightness-110 disabled:opacity-60"
      >
        {pending ? "جاري الرفع والتحقق..." : "إنشاء المشروع"}
      </button>
    </form>
  );
}
