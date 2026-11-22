
export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

/* ---------- layout ---------- */

export function Card({
  title, subtitle, actions, children, className, pad = true,
}: {
  title?: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode;
  children: React.ReactNode; className?: string; pad?: boolean;
}) {
  return (
    <section className={cx("rounded-2xl border border-line bg-panel shadow-[0_1px_2px_rgba(15,23,42,0.04)]", className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start gap-3 border-b border-line px-5 py-3.5">
          <div className="me-auto">
            {title && <h2 className="text-[15px] font-semibold">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className={pad ? "p-5" : ""}>{children}</div>
    </section>
  );
}

export function PageTitle({ title, subtitle, actions }: { title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end gap-3">
      <div className="me-auto">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

/* ---------- buttons & badges ---------- */

type BtnVariant = "primary" | "ghost" | "danger" | "soft";
export function btn(variant: BtnVariant = "primary", size: "sm" | "md" = "md") {
  return cx(
    "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
    size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
    variant === "primary" && "bg-brand text-white shadow-sm hover:bg-brand-ink",
    variant === "soft" && "bg-brand-soft text-brand hover:bg-indigo-100",
    variant === "ghost" && "border border-line bg-panel text-ink hover:bg-canvas",
    variant === "danger" && "border border-rose-200 bg-panel text-bad hover:bg-bad-soft",
  );
}

export function Badge({ tone = "neutral", children }: { tone?: "good" | "bad" | "warn" | "neutral" | "brand"; children: React.ReactNode }) {
  const t = {
    good: "bg-good-soft text-good",
    bad: "bg-bad-soft text-bad",
    warn: "bg-warn-soft text-warn",
    neutral: "bg-slate-100 text-slate-600",
    brand: "bg-brand-soft text-brand",
  }[tone];
  return <span className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", t)}>{children}</span>;
}

/* ---------- form ---------- */

export const inputCls =
  "w-full rounded-xl border border-line bg-panel px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:ring-brand/10 aria-[invalid=true]:border-bad aria-[invalid=true]:ring-bad/10";

export function Field({
  label, hint, error, warning, children, required,
}: { label: string; hint?: string; error?: string; warning?: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">
        {label} {required && <span className="text-bad">*</span>}
      </span>
      {children}
      {error ? <span className="block text-xs text-bad">{error}</span>
        : warning ? <span className="block text-xs text-warn">⚠ {warning}</span>
        : hint ? <span className="block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export { Issues } from "./issues";

export { Stat, type Formula } from "./stat";

/* ---------- formatting ---------- */

export const pct = (v: number, d = 2) => `${(v * 100).toFixed(d)}%`;
export const money = (v: number): string => {
  const a = Math.abs(v), sign = v < 0 ? "-" : "";
  return sign + (a >= 1e6 ? `${(a / 1e6).toFixed(2)}M` : a >= 1e3 ? `${(a / 1e3).toFixed(1)}K` : a.toFixed(0));
};
export const fullMoney = (v: number) => v.toLocaleString("en-US", { maximumFractionDigits: 0 });
export const fmtDate = (s: string) =>
  new Date(s + "T00:00:00Z").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
export const monthLabel = (s: string) =>
  new Date(s + "T00:00:00Z").toLocaleDateString("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" });
