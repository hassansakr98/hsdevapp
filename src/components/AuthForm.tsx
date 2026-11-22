"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, register, type FormState } from "@/lib/auth";
import { Field, btn, inputCls } from "./ui/kit";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    mode === "login" ? login : register,
    undefined,
  );
  const isReg = mode === "register";

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center p-6">
        <form action={action} className="w-full max-w-sm space-y-5">
          <div>
            <div className="mb-8 flex items-center gap-2">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand font-bold text-white">hs</div>
              <span className="text-lg font-bold">hsdevapp</span>
            </div>
            <h1 className="text-2xl font-bold">{isReg ? "أنشئ حساب شركتك" : "أهلاً فيك من جديد"}</h1>
            <p className="mt-1 text-sm text-muted">{isReg ? "حساب واحد للشركة، وبتضيف فريقك لاحقاً" : "سجّل دخول لتتابع مشاريعك"}</p>
          </div>

          {isReg && (
            <>
              <Field label="اسم الشركة"><input name="company" required defaultValue={state?.values?.company} className={inputCls} /></Field>
              <Field label="اسمك"><input name="name" required defaultValue={state?.values?.name} className={inputCls} /></Field>
            </>
          )}
          <Field label="البريد الإلكتروني">
            <input name="email" type="email" dir="ltr" required defaultValue={state?.values?.email} className={inputCls} />
          </Field>
          <Field label="كلمة المرور" hint={isReg ? "8 أحرف على الأقل" : undefined}>
            <input name="password" type="password" dir="ltr" required minLength={isReg ? 8 : 1} className={inputCls} />
          </Field>

          {state?.error && <p className="rounded-xl bg-bad-soft p-3 text-sm text-bad">{state.error}</p>}

          <button disabled={pending} className={`${btn("primary")} w-full py-2.5`}>
            {pending ? "…" : isReg ? "إنشاء الحساب" : "دخول"}
          </button>

          <p className="text-center text-sm text-muted">
            {isReg ? "عندك حساب؟ " : "ما عندك حساب؟ "}
            <Link href={isReg ? "/login" : "/register"} className="font-medium text-brand hover:underline">
              {isReg ? "سجّل دخول" : "أنشئ حساب"}
            </Link>
          </p>
        </form>
      </div>

      <div className="relative hidden overflow-hidden bg-brand lg:block">
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-white/10" />
        <div className="absolute -bottom-32 -right-16 h-[28rem] w-[28rem] rounded-full bg-indigo-400/30" />
        <div className="relative flex h-full flex-col justify-center p-14 text-white">
          <h2 className="text-3xl font-bold leading-snug">اعرف وين مشروعك<br />بالضبط، كل أسبوع.</h2>
          <p className="mt-4 max-w-md text-indigo-100">
            منحنيات التقدم، القيمة المكتسبة، وتوقعات الانتهاء والتكلفة. محسوبة من بياناتك بمعادلات واضحة، مع رقابة على كل إدخال.
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
