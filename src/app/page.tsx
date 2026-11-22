import Link from "next/link";
import AppShell from "@/components/AppShell";
import { Badge, PageTitle, btn } from "@/components/ui/kit";
import { snapshot } from "@/lib/calc";
import { requireUser } from "@/lib/current-user";
import { createDemoProject } from "@/lib/project-actions";
import { getProject, listProjects } from "@/lib/projects";

export const instant = false;

export default async function Home() {
  const user = await requireUser();
  const projects = listProjects(user.company_id).map((p) => {
    const full = getProject(user.company_id, p.id)!;
    const d = full.dataDates.at(-1);
    const s = d ? snapshot(full, full.activities, d) : null;
    return { ...p, s };
  });

  return (
    <AppShell user={user}>
      <PageTitle
        title="المشاريع"
        subtitle={`${projects.length} مشروع · ${user.company_name}`}
        actions={
          <div className="flex gap-2">
            <form action={createDemoProject}><button className={btn("ghost")}>مشروع تجريبي</button></form>
            <Link href="/projects/new" className={btn("primary")}>+ مشروع جديد</Link>
          </div>
        }
      />

      {projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-panel p-14 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-soft text-xl text-brand">▦</div>
          <p className="mt-4 text-lg font-semibold">ابدأ أول مشروع</p>
          <p className="mt-1 text-sm text-muted">دخّل الأنشطة يدوياً أو ارفع ملف Excel، أو جرّب على مشروع تجريبي.</p>
          <Link href="/projects/new" className={`${btn("primary")} mt-5`}>+ مشروع جديد</Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => {
            const s = p.s;
            const tone = !s ? "neutral" : s.spi >= 0.98 ? "good" : s.spi < 0.9 ? "bad" : "warn";
            return (
              <Link key={p.id} href={`/projects/${p.id}`} className="group rounded-2xl border border-line bg-panel p-5 transition hover:border-brand hover:shadow-lg hover:shadow-brand/5">
                <div className="flex items-start gap-2">
                  <div className="ml-auto">
                    <div className="font-semibold group-hover:text-brand">{p.name}</div>
                    <div className="num mt-0.5 text-right text-xs text-muted">{p.contract_start} → {p.contract_finish}</div>
                  </div>
                  <Badge tone={tone}>{!s ? "بدون تحديثات" : `SPI ${s.spi.toFixed(2)}`}</Badge>
                </div>
                <div className="mt-5 flex items-end justify-between">
                  <div>
                    <div className="num text-3xl font-bold">{s ? `${(s.actualPct * 100).toFixed(1)}%` : "—"}</div>
                    <div className="text-xs text-muted">منجز{s && <> من <span className="num">{(s.plannedPct * 100).toFixed(1)}%</span> مخطط</>}</div>
                  </div>
                  <div className="text-left text-xs text-muted">
                    <div><span className="num">{p.activity_count}</span> نشاط</div>
                    <div>آخر تحديث <span className="num">{p.last_data_date ?? "—"}</span></div>
                  </div>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100" dir="ltr">
                  <div className="relative h-full">
                    <div className="absolute inset-y-0 left-0 bg-indigo-200" style={{ width: `${(s?.plannedPct ?? 0) * 100}%` }} />
                    <div className="absolute inset-y-0 left-0 bg-orange-500" style={{ width: `${(s?.actualPct ?? 0) * 100}%` }} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
