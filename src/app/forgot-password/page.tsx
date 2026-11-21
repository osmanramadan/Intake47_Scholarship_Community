"use client";

import { fetchWithProgress as fetch } from "@/lib/request-progress";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/language-provider";
import { LanguageSwitcher } from "@/components/language-switcher";

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.get("email") }),
    });
    const body = await response.json();
    setMessage(t(body.message ?? body.error));
    setSuccess(response.ok);
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-slate-950 px-4 py-8 sm:px-6">
      <LanguageSwitcher className="absolute right-4 top-4 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700" />
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{t("Forgot password")}</h1>
        {message && <p className={`mt-5 rounded-xl px-4 py-3 text-sm ${success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{message}</p>}
        <label className="mt-6 block text-sm font-semibold text-slate-900">
          {t("Email")}
          <input name="email" type="email" required className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" />
        </label>
        <button className="mt-6 w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white">{t("Send reset link")}</button>
        <Link href="/login" className="mt-5 block text-center text-sm font-semibold text-emerald-700">{t("Back to sign in")}</Link>
      </form>
    </main>
  );
}
