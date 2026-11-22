"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, register, type FormState } from "@/lib/auth";
import { LangSwitch, useTr } from "./LangProvider";
import { Field, btn, inputCls } from "./ui/kit";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    mode === "login" ? login : register,
    undefined,
  );
  const tr = useTr();
  const isReg = mode === "register";

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative flex items-center justify-center p-6">
        <LangSwitch className="absolute end-6 top-6" />
        <form action={action} className="w-full max-w-sm space-y-5">
          <div>
            <div className="mb-8 flex items-center gap-2">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand font-bold text-white">hs</div>
              <span className="text-lg font-bold">hsdevapp</span>
            </div>
            <h1 className="text-2xl font-bold">
              {isReg ? tr("أنشئ حساب شركتك", "Create your company account") : tr("أهلاً فيك من جديد", "Welcome back")}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {isReg
                ? tr("حساب واحد للشركة، وبتضيف فريقك لاحقاً", "One account for your company — add your team later")
                : tr("سجّل دخول لتتابع مشاريعك", "Sign in to follow your projects")}
            </p>
          </div>

          {isReg && (
            <>
              <Field label={tr("اسم الشركة", "Company name")}><input name="company" required defaultValue={state?.values?.company} className={inputCls} /></Field>
              <Field label={tr("اسمك", "Your name")}><input name="name" required defaultValue={state?.values?.name} className={inputCls} /></Field>
            </>
          )}
          <Field label={tr("البريد الإلكتروني", "Email")}>
            <input name="email" type="email" dir="ltr" required defaultValue={state?.values?.email} className={inputCls} />
          </Field>
          <Field label={tr("كلمة المرور", "Password")} hint={isReg ? tr("8 أحرف على الأقل", "At least 8 characters") : undefined}>
            <input name="password" type="password" dir="ltr" required minLength={isReg ? 8 : 1} className={inputCls} />
          </Field>

          {state?.error && <p className="rounded-xl bg-bad-soft p-3 text-sm text-bad">{state.error}</p>}

          <button disabled={pending} className={`${btn("primary")} w-full py-2.5`}>
            {pending ? "…" : isReg ? tr("إنشاء الحساب", "Create account") : tr("دخول", "Sign in")}
          </button>

          <p className="text-center text-sm text-muted">
            {isReg ? tr("عندك حساب؟ ", "Already have an account? ") : tr("ما عندك حساب؟ ", "No account yet? ")}
            <Link href={isReg ? "/login" : "/register"} className="font-medium text-brand hover:underline">
              {isReg ? tr("سجّل دخول", "Sign in") : tr("أنشئ حساب", "Create one")}
            </Link>
          </p>
        </form>
      </div>

      <div className="relative hidden overflow-hidden bg-brand lg:block">
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-white/10" />
        <div className="absolute -bottom-32 -right-16 h-[28rem] w-[28rem] rounded-full bg-indigo-400/30" />
        <div className="relative flex h-full flex-col justify-center p-14 text-white">
          <h2 className="text-3xl font-bold leading-snug">
            {tr("اعرف وين مشروعك", "Know exactly where")}<br />{tr("بالضبط، كل أسبوع.", "your project stands, every week.")}
          </h2>
          <p className="mt-4 max-w-md text-indigo-100">
            {tr(
              "منحنيات التقدم، القيمة المكتسبة، وتوقعات الانتهاء والتكلفة. محسوبة من بياناتك بمعادلات واضحة، مع رقابة على كل إدخال.",
              "Progress curves, earned value, and finish and cost forecasts — calculated from your data with transparent formulas and checks on every entry.",
            )}
          </p>
          <div className="mt-10 grid max-w-md grid-cols-3 gap-3 text-center">
            {[["SPI", "0.94"], ["CPI", "1.02"], ["EAC", "41.3M"]].map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                <div className="text-xs text-indigo-200">{k}</div>
                <div className="num mt-1 text-xl font-bold">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
