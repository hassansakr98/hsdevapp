"use client";

import { useActionState } from "react";
import { saveProjectSettings, type ActionState } from "@/lib/manual-actions";
import { removeProject } from "@/lib/project-actions";
import { auditLabel } from "@/lib/i18n";
import { useLang, useTr } from "./LangProvider";
import { Card, Field, Issues, btn, inputCls } from "./ui/kit";

export default function ProjectSettings({
  meta, canDelete, audit,
}: {
  meta: { id: string; name: string; contract_start: string; contract_finish: string };
  canDelete: boolean;
  audit: { user_name: string; action: string; details: string; created_at: string }[];
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveProjectSettings, undefined);
  const tr = useTr();
  const lang = useLang();
  const v = state?.values;
  const err = (k: string) => state?.errors?.find((e) => e.field === k)?.message;

  return (
    <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
      <div className="space-y-5">
        <Card title={tr("بيانات المشروع", "Project details")}>
          <form action={action} className="space-y-4">
            <input type="hidden" name="projectId" value={meta.id} />
            <Field label={tr("اسم المشروع", "Project name")} required error={err("name")}>
              <input name="name" defaultValue={v?.name ?? meta.name} required className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={tr("بداية العقد", "Contract start")} required error={err("contractStart")}>
                <input name="contractStart" type="date" defaultValue={v?.contractStart ?? meta.contract_start} required className={inputCls} />
              </Field>
              <Field label={tr("نهاية العقد", "Contract finish")} required error={err("contractFinish")}>
                <input name="contractFinish" type="date" defaultValue={v?.contractFinish ?? meta.contract_finish} required className={inputCls} />
              </Field>
            </div>
            <Issues errors={state?.errors?.filter((e) => !e.field)} />
            {state?.ok && <p className="rounded-xl bg-good-soft p-2 text-sm text-good">✓ {state.message}</p>}
            <button disabled={pending} className={btn("primary")}>{pending ? tr("جاري الحفظ…", "Saving…") : tr("حفظ", "Save")}</button>
          </form>
        </Card>

        {canDelete && (
          <Card title={tr("منطقة الخطر", "Danger zone")}>
            <p className="mb-3 text-sm text-muted">{tr("حذف المشروع بيحذف كل الأنشطة والتحديثات والسجل. ما بينفع نرجّعه.", "Deleting the project removes all activities, updates and the log. This can't be undone.")}</p>
            <form
              action={removeProject}
              onSubmit={(e) => { if (!confirm(tr(`حذف المشروع "${meta.name}" نهائياً؟`, `Permanently delete "${meta.name}"?`))) e.preventDefault(); }}
            >
              <input type="hidden" name="id" value={meta.id} />
              <button className={btn("danger")}>{tr("حذف المشروع", "Delete project")}</button>
            </form>
          </Card>
        )}
      </div>

      <Card title={tr("سجل التغييرات", "Change log")} subtitle={tr("مين عدّل شو ومتى. ما بينعدّل ولا بينحذف", "Who changed what, and when. Can't be edited or deleted")} pad={false}>
        {audit.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted">{tr("ما في تغييرات مسجّلة لسا", "No changes recorded yet")}</p>
        ) : (
          <ol className="divide-y divide-line">
            {audit.map((a, i) => (
              <li key={i} className="flex gap-3 px-5 py-3 text-sm">
                <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />
                <div className="me-auto">
                  <div><b>{a.user_name}</b> · {auditLabel(a.action, lang)}</div>
                  {a.details && <div className="mt-0.5 text-xs text-muted">{a.details}</div>}
                </div>
                <time className="num shrink-0 text-xs text-muted">{a.created_at} UTC</time>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
