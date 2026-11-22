import Link from "next/link";
import { notFound } from "next/navigation";
import AppShell from "@/components/AppShell";
import { ProjectTabs } from "@/components/SideNav";
import { btn } from "@/components/ui/kit";
import { requireUser } from "@/lib/current-user";
import { getTr } from "@/lib/i18n-server";
import { getProjectMeta } from "@/lib/projects";

export default async function ProjectLayout({ children, params }: LayoutProps<"/projects/[id]">) {
  const user = await requireUser();
  const tr = await getTr();
  const { id } = await params;
  const meta = getProjectMeta(user.company_id, id);
  if (!meta) notFound();

  return (
    <AppShell user={user}>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="me-auto">
          <Link href="/" className="text-xs text-muted hover:text-brand">{tr("→ المشاريع", "← Projects")}</Link>
          <h1 className="text-2xl font-bold tracking-tight">{meta.name}</h1>
          <p className="num mt-0.5 text-xs text-muted"><span className="ltr">{meta.contract_start} → {meta.contract_finish}</span></p>
        </div>
        <Link href={`/projects/${id}/progress`} className={btn("primary")}>+ {tr("تحديث التقدم", "Update progress")}</Link>
      </div>
      <ProjectTabs id={id} />
      <div className="pt-5">{children}</div>
    </AppShell>
  );
}
