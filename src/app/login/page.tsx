"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { PasswordInput } from "@/components/password-input";
import { useLanguage } from "@/components/language-provider";
import { LanguageSwitcher } from "@/components/language-switcher";

export default function LoginPage() {
  const { t } = useLanguage();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      email: String(form.get("email")),
      password: String(form.get("password")),
      redirect: false,
    });

    setLoading(false);
    if (result?.error) {
      setError(t("Invalid credentials or unverified account."));
      return;
    }
    window.location.href = "/";
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-slate-950 px-4 py-8 text-slate-900 sm:px-6">
      <LanguageSwitcher className="absolute right-4 top-4 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700" />
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
        <h1 className="text-2xl font-bold sm:text-3xl">{t("Welcome back")}</h1>
        <p className="mt-2 text-slate-500">{t("Sign in to your scholarship community account.")}</p>

        {error && <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <label className="mt-6 block text-sm font-semibold">
          {t("Email")}
          <input name="email" type="email" required autoComplete="email"
            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500" />
        </label>
        <label className="mt-4 block text-sm font-semibold">
          {t("Password")}
          <PasswordInput name="password" required minLength={8} autoComplete="current-password"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500" />
        </label>
        <button disabled={loading} className="mt-6 w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
          {loading ? t("Signing in...") : t("Sign in")}
        </button>
        <p className="mt-4 text-center text-sm">
          <Link href="/forgot-password" className="font-semibold text-emerald-700">{t("Forgot password?")}</Link>
        </p>
        <p className="mt-5 text-center text-sm text-slate-500">
          {t("New student?")} <Link href="/register" className="font-semibold text-emerald-700">{t("Create an account")}</Link>
        </p>
      </form>
    </main>
  );
}
