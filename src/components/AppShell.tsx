import { logout } from "@/lib/auth";
import { getTr } from "@/lib/i18n-server";
import { LangSwitch } from "./LangProvider";
import { SideNav } from "./SideNav";

export default async function AppShell({
  user,
  children,
}: {
  user: { name: string; company_name: string; role?: string };
  children: React.ReactNode;
}) {
  const tr = await getTr();
  return (
    <div className="flex min-h-screen">
      <aside className="no-print sticky top-0 flex h-screen w-60 shrink-0 flex-col border-e border-line bg-panel px-3 py-4">
        <div className="mb-6 flex items-center gap-2 px-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-sm font-bold text-white">hs</div>
          <div>
            <div className="text-[15px] font-bold leading-tight">hsdevapp</div>
            <div className="text-[11px] text-muted">{tr("ضبط المشاريع", "Project control")}</div>
          </div>
        </div>
        <SideNav />
        <div className="mt-auto space-y-3">
          <LangSwitch className="px-2" />
          <div className="rounded-xl bg-canvas p-3">
            <div className="text-sm font-semibold">{user.name}</div>
            <div className="text-xs text-muted">{user.company_name}</div>
            <form action={logout}>
              <button className="mt-2 text-xs font-medium text-bad hover:underline">{tr("تسجيل خروج", "Log out")}</button>
            </form>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-8 py-6">{children}</main>
    </div>
  );
}
