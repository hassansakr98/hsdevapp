import AppShell from "@/components/AppShell";
import NewProjectForm from "@/components/NewProjectForm";
import { PageTitle } from "@/components/ui/kit";
import { requireUser } from "@/lib/current-user";

export const instant = false;

export default async function NewProjectPage() {
  const user = await requireUser();
  return (
    <AppShell user={user}>
      <PageTitle title="مشروع جديد" subtitle="اختار طريقة إدخال البيانات. بتقدر تكمّل يدوياً بعد الاستيراد كمان." />
      <NewProjectForm />
    </AppShell>
  );
}
