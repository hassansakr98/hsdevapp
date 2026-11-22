"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTr } from "./LangProvider";
import { cx } from "./ui/kit";

export function SideNav() {
  const path = usePathname();
  const tr = useTr();
  const items = [
    { href: "/", label: tr("المشاريع", "Projects"), icon: "▦", match: (p: string) => p === "/" || (p.startsWith("/projects/") && !p.startsWith("/projects/new")) },
    { href: "/projects/new", label: tr("مشروع جديد", "New project"), icon: "+", match: (p: string) => p.startsWith("/projects/new") },
    { href: "/methodology", label: tr("طريقة الحساب", "Methodology"), icon: "ƒ", match: (p: string) => p.startsWith("/methodology") },
  ];
  return (
    <nav className="space-y-1">
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          className={cx(
            "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
            i.match(path) ? "bg-brand-soft text-brand" : "text-slate-600 hover:bg-canvas hover:text-ink",
          )}
        >
          <span className="grid h-6 w-6 place-items-center rounded-lg bg-white/60 text-xs">{i.icon}</span>
          {i.label}
        </Link>
      ))}
    </nav>
  );
}

export function ProjectTabs({ id }: { id: string }) {
  const path = usePathname();
  const tr = useTr();
  const base = `/projects/${id}`;
  const tabs = [
    { href: base, label: tr("نظرة عامة", "Overview") },
    { href: `${base}/analysis`, label: tr("التحليلات", "Analysis") },
    { href: `${base}/activities`, label: tr("الأنشطة", "Activities") },
    { href: `${base}/progress`, label: tr("تحديث التقدم", "Progress update") },
    { href: `${base}/settings`, label: tr("الإعدادات والسجل", "Settings & log") },
  ];
  return (
    <div className="no-print flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((t) => {
        const active = t.href === base ? path === base : path.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cx(
              "-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition",
              active ? "border-brand text-brand" : "border-transparent text-muted hover:text-ink",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
