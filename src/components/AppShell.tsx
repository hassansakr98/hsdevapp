import Link from "next/link";
import { logout } from "@/lib/auth";

export default function AppShell({
  user,
  children,
}: {
  user: { name: string; company_name: string };
  children: React.ReactNode;
}) {
  return (
    <div dir="rtl" className="min-h-screen bg-[#1f2230] text-white">
      <header className="flex items-center gap-4 border-b-4 border-[#f4b942] bg-[#2b2f3e] px-6 py-3">
        <Link href="/" className="text-xl font-bold text-[#2ec4b6]">hsdevapp</Link>
        <span className="text-sm text-gray-400">{user.company_name}</span>
        <div className="mr-auto flex items-center gap-3 text-sm">
          <span>{user.name}</span>
          <form action={logout}>
            <button className="rounded-lg border border-[#f26d6d] px-3 py-1 text-[#f26d6d] hover:bg-[#f26d6d] hover:text-white">
              تسجيل خروج
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-6">{children}</main>
    </div>
  );
}
