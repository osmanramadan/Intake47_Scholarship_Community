"use client";

import { useSyncExternalStore } from "react";
import { useLanguage } from "@/components/language-provider";
import { getActiveRequestCount, subscribeToRequestProgress } from "@/lib/request-progress";

export function RequestLoadingMessage({ fullScreen = false }: { fullScreen?: boolean }) {
  const { locale, t } = useLanguage();

  return (
    <div
      dir={locale === "ar" ? "rtl" : "ltr"}
      className={
        fullScreen
          ? "flex min-h-[60vh] items-center justify-center px-4"
          : "pointer-events-none fixed inset-x-0 top-3 z-[200] flex justify-center px-4"
      }
    >
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="flex items-center gap-3 rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 animate-spin">
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="3" />
          <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="3" />
        </svg>
        <span>{t("Request in progress...")}</span>
      </div>
    </div>
  );
}

export function RequestProgressIndicator() {
  const requestCount = useSyncExternalStore(
    subscribeToRequestProgress,
    getActiveRequestCount,
    () => 0,
  );

  return requestCount > 0 ? <RequestLoadingMessage /> : null;
}
