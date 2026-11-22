/**
 * Bilingual helper. Text is written inline in both languages:
 *   tr("المشاريع", "Projects")
 * so every new string is added in both languages at the place it's used.
 */
export type Lang = "ar" | "en";
export const LANG_COOKIE = "hs_lang";
export const DEFAULT_LANG: Lang = "ar";

export type Tr = (ar: string, en: string) => string;

export const makeTr = (lang: Lang): Tr => (ar, en) => (lang === "ar" ? ar : en);
export const isLang = (v: unknown): v is Lang => v === "ar" || v === "en";
export const dirOf = (lang: Lang) => (lang === "ar" ? "rtl" : "ltr");

/** Audit log actions are stored as codes and translated when displayed */
const AUDIT: Record<string, [string, string]> = {
  "project.create": ["إنشاء المشروع", "Project created"],
  "project.update": ["تعديل بيانات المشروع", "Project details changed"],
  "project.demo": ["إنشاء مشروع تجريبي", "Demo project created"],
  "project.import": ["استيراد من Excel", "Imported from Excel"],
  "activity.add": ["إضافة نشاط", "Activity added"],
  "activity.edit": ["تعديل نشاط", "Activity edited"],
  "activity.delete": ["حذف نشاط", "Activity deleted"],
  "progress.new": ["تحديث تقدم جديد", "New progress update"],
  "progress.edit": ["تعديل تحديث تقدم", "Progress update edited"],
  "progress.delete": ["حذف تحديث تقدم", "Progress update deleted"],
};
export const auditLabel = (action: string, lang: Lang) => {
  // older entries were stored as Arabic text instead of a code
  const m = AUDIT[action] ?? Object.values(AUDIT).find(([ar]) => ar === action);
  return m ? m[lang === "ar" ? 0 : 1] : action;
};
