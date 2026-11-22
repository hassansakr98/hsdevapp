import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import { LangProvider } from "@/components/LangProvider";
import { dirOf } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";
import "./globals.css";

const plex = IBM_Plex_Sans_Arabic({
  variable: "--font-plex",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
  const ar = (await getLang()) === "ar";
  return {
    title: ar ? "hsdevapp — ضبط المشاريع" : "hsdevapp — Project Control",
    description: ar
      ? "متابعة تقدم المشاريع وتحليل القيمة المكتسبة لمهندسي التخطيط"
      : "Project progress tracking and earned value analysis for planning engineers",
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const lang = await getLang();
  return (
    <html lang={lang} dir={dirOf(lang)} className={`${plex.variable} h-full antialiased`}>
      <body className="min-h-full">
        <LangProvider lang={lang}>{children}</LangProvider>
      </body>
    </html>
  );
}
