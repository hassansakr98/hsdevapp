"use client";

import type { Issue } from "@/lib/validation";
import { useTr } from "../LangProvider";

export function Issues({ errors, warnings, confirmable }: { errors?: Issue[]; warnings?: Issue[]; confirmable?: boolean }) {
  const tr = useTr();
  if (!errors?.length && !warnings?.length) return null;
  return (
    <div className="space-y-3">
      {!!errors?.length && (
        <div className="rounded-xl border border-rose-200 bg-bad-soft p-3 text-sm text-bad">
          <div className="mb-1 font-semibold">{tr("ما انحفظ شي. صحّح هالأخطاء:", "Nothing was saved. Fix these errors:")}</div>
          <ul className="list-inside list-disc space-y-0.5">
            {errors.slice(0, 15).map((e, i) => <li key={i}>{e.message}</li>)}
            {errors.length > 15 && <li>{tr(`و ${errors.length - 15} أخطاء كمان…`, `and ${errors.length - 15} more…`)}</li>}
          </ul>
        </div>
      )}
      {!!warnings?.length && (
        <div className="rounded-xl border border-amber-200 bg-warn-soft p-3 text-sm text-amber-800">
          <div className="mb-1 font-semibold">⚠ {tr("تحذيرات بدها مراجعة", "Warnings to review")}</div>
          <ul className="list-inside list-disc space-y-0.5">
            {warnings.slice(0, 15).map((e, i) => <li key={i}>{e.message}</li>)}
            {warnings.length > 15 && <li>{tr(`و ${warnings.length - 15} تحذيرات كمان…`, `and ${warnings.length - 15} more…`)}</li>}
          </ul>
          {confirmable && !errors?.length && (
            <p className="mt-2 font-medium">
              {tr("إذا راجعتها ومتأكد إنها صح، اكبس الحفظ مرة تانية للتأكيد.", "If you've reviewed them and they're correct, press save again to confirm.")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
