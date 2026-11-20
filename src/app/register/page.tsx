"use client";

import { fetchWithProgress as fetch } from "@/lib/request-progress";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { PasswordInput } from "@/components/password-input";
import { useLanguage } from "@/components/language-provider";
import { LanguageSwitcher } from "@/components/language-switcher";

export default function RegisterPage() {
  const { t } = useLanguage();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: form.get("fullName"),
        email: form.get("email"),
        password: form.get("password"),
      }),
    });
    const body = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(t(body.error ?? "Unable to create the account."));
      return;
    }
    setMessage(t(body.message));
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-slate-950 px-4 py-8 text-slate-900 sm:px-6">
      <LanguageSwitcher className="absolute right-4 top-4 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700" />
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
        <h1 className="text-2xl font-bold sm:text-3xl">{t("Create your account")}</h1>
        <p className="mt-2 text-slate-500">{t("Register with your scholarship email address.")}</p>

        {error && <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        {message && <p className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>}

        <label className="mt-6 block text-sm font-semibold">
          {t("Full name")}
          <input name="fullName" required minLength={2} maxLength={100} autoComplete="name"
            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500" />
        </label>
        <label className="mt-4 block text-sm font-semibold">
          {t("Email")}
          <input name="email" type="email" required autoComplete="email"
            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500" />
        </label>
        <label className="mt-4 block text-sm font-semibold">
          {t("Password")}
          <PasswordInput name="password" required minLength={8} maxLength={128} autoComplete="new-password"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500" />
        </label>
        <button disabled={loading} className="mt-6 w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
          {loading ? t("Creating account...") : t("Create account")}
        </button>
        <p className="mt-5 text-center text-sm text-slate-500">
          {t("Already registered?")} <Link href="/login" className="font-semibold text-emerald-700">{t("Sign in")}</Link>
        </p>
      </form>
    </main>
  );
}
