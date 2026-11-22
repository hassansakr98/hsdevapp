"use client";

import { createContext, useContext } from "react";
import { makeTr, type Lang } from "@/lib/i18n";
import { setLang } from "@/lib/lang-action";

const Ctx = createContext<Lang>("ar");

export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <Ctx.Provider value={lang}>{children}</Ctx.Provider>;
}

export const useLang = () => useContext(Ctx);
export const useTr = () => makeTr(useContext(Ctx));

/** Toggle button: shows the language you'd switch to */
export function LangSwitch({ className = "" }: { className?: string }) {
  const lang = useLang();
  const next = lang === "ar" ? "en" : "ar";
  return (
    <form action={setLang} className={className}>
      <input type="hidden" name="lang" value={next} />
      <button
        className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-panel px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-brand hover:text-brand"
        title={next === "en" ? "Switch to English" : "التبديل للعربية"}
      >
        <span aria-hidden>🌐</span>
        {next === "en" ? "English" : "العربية"}
      </button>
    </form>
  );
}
