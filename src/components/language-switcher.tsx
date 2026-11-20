"use client";

import { useLanguage } from "@/components/language-provider";
import { LOCALE_COOKIE_NAME } from "@/lib/i18n";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, t } = useLanguage();

  function switchLanguage() {
    const nextLocale = locale === "en" ? "ar" : "en";
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${LOCALE_COOKIE_NAME}=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
    window.location.reload();
  }

  return (
    <button
      type="button"
      onClick={switchLanguage}
      aria-label={t(locale === "en" ? "Switch to Arabic" : "Switch to English")}
      className={`cursor-pointer ${className}`}
    >
      <span>{locale === "en" ? "EN" : "AR"}</span>
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" d="M3 12h18M12 3a15 15 0 010 18m0-18a15 15 0 000 18" />
      </svg>
    </button>
  );
}
