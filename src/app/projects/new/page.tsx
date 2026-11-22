import AppShell from "@/components/AppShell";
import NewProjectForm from "@/components/NewProjectForm";
import { PageTitle } from "@/components/ui/kit";
import { requireUser } from "@/lib/current-user";
import { getTr } from "@/lib/i18n-server";

export const instant = false;

export default async function NewProjectPage() {
  const user = await requireUser();
  const tr = await getTr();
  return (
    <AppShell user={user}>
      <PageTitle
        title={tr("مشروع جديد", "New project")}
        subtitle={tr("اختار طريقة إدخال البيانات. بتقدر تكمّل يدوياً بعد الاستيراد كمان.", "Choose how to enter data. You can keep editing manually after an import too.")}
      />
      <NewProjectForm />
    </AppShell>
  );
}
