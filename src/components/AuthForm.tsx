"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, register, type FormState } from "@/lib/auth";

const input =
  "w-full rounded-lg border border-[#454a5c] bg-[#1f2230] px-3 py-2 text-white outline-none focus:border-[#2ec4b6]";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    mode === "login" ? login : register,
    undefined,
  );
  const isReg = mode === "register";

  return (
    <div dir="rtl" className="flex min-h-screen items-center justify-center bg-[#1f2230] p-4">
      <form action={action} className="w-full max-w-sm space-y-4 rounded-xl bg-[#2b2f3e] p-6 text-white shadow-xl">
        <div className="text-center">
          <div className="text-2xl font-bold text-[#2ec4b6]">hsdevapp</div>
          <div className="mt-1 text-sm text-gray-300">{isReg ? "إنشاء حساب شركة جديد" : "تسجيل الدخول"}</div>
        </div>

        {isReg && (
          <>
            <label className="block space-y-1 text-sm">
              <span>اسم الشركة</span>
              <input name="company" required defaultValue={state?.values?.company} className={input} />
            </label>
            <label className="block space-y-1 text-sm">
              <span>اسمك</span>
              <input name="name" required defaultValue={state?.values?.name} className={input} />
            </label>
          </>
        )}
        <label className="block space-y-1 text-sm">
          <span>البريد الإلكتروني</span>
          <input name="email" type="email" dir="ltr" required defaultValue={state?.values?.email} className={input} />
        </label>
        <label className="block space-y-1 text-sm">
          <span>كلمة المرور</span>
          <input name="password" type="password" dir="ltr" required minLength={isReg ? 8 : 1} className={input} />
        </label>

        {state?.error && <p className="rounded bg-[#f26d6d]/20 p-2 text-sm text-[#f26d6d]">{state.error}</p>}

        <button
          disabled={pending}
          className="w-full rounded-lg bg-[#2ec4b6] py-2 font-semibold text-[#12303a] hover:brightness-110 disabled:opacity-60"
        >
          {pending ? "..." : isReg ? "إنشاء الحساب" : "دخول"}
        </button>

        <p className="text-center text-sm text-gray-300">
          {isReg ? "عندك حساب؟ " : "ما عندك حساب؟ "}
          <Link href={isReg ? "/login" : "/register"} className="text-[#2ec4b6] hover:underline">
            {isReg ? "سجّل دخول" : "أنشئ حساب"}
          </Link>
        </p>
      </form>
    </div>
  );
}
