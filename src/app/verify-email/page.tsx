"use client";

import { fetchWithProgress as fetch } from "@/lib/request-progress";
import { useEffect, useState } from "react";
import { useLanguage } from "@/components/language-provider";
import { LanguageSwitcher } from "@/components/language-switcher";

export default function VerifyEmailPage() {
  const { t } = useLanguage();
  const [message, setMessage] = useState(t("Verifying..."));
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      setMessage(t("No verification token was provided."));
      return;
    }

    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    }).then(async (response) => {
      const body = await response.json();
      setSuccess(response.ok);
      setMessage(t(body.message ?? body.error));
    }).catch(() => {
      setMessage(t("Unable to verify your email. Please try again."));
    });
  }, [t]);

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-slate-950 px-4 py-8 sm:px-6">
      <LanguageSwitcher className="absolute right-4 top-4 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700" />
      <section className={`w-full max-w-md rounded-3xl p-6 text-center sm:p-8 ${success ? "bg-green-50" : "bg-white"}`}>
        <h1 className="text-2xl font-bold text-slate-900">{t("Email verification")}</h1>
        <p className={`mt-4 ${success ? "text-green-700" : "text-slate-600"}`}>{message}</p>
        {success && (
          <a href="/login" className="mt-6 inline-block rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white">
            {t("Go to sign in")}
          </a>
        )}
      </section>
    </main>
  );
}
