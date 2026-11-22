"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "./ui/kit";

const ITEMS = [
  { href: "/", label: "المشاريع", icon: "▦", match: (p: string) => p === "/" || p.startsWith("/projects/") && !p.startsWith("/projects/new") },
  { href: "/projects/new", label: "مشروع جديد", icon: "+", match: (p: string) => p.startsWith("/projects/new") },
  { href: "/methodology", label: "طريقة الحساب", icon: "ƒ", match: (p: string) => p.startsWith("/methodology") },
];

export function SideNav() {
  const path = usePathname();
  return (
    <nav className="space-y-1">
      {ITEMS.map((i) => (
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
  const base = `/projects/${id}`;
  const tabs = [
    { href: base, label: "نظرة عامة" },
    { href: `${base}/analysis`, label: "التحليلات" },
    { href: `${base}/activities`, label: "الأنشطة" },
    { href: `${base}/progress`, label: "تحديث التقدم" },
    { href: `${base}/settings`, label: "الإعدادات والسجل" },
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
