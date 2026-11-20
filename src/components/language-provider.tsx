"use client";

import { createContext, useContext, useMemo } from "react";
import { DEFAULT_LOCALE, translate, type Locale } from "@/lib/i18n";

type LanguageContextValue = {
  locale: Locale;
  t: (message: string, values?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageContextValue>({
  locale: DEFAULT_LOCALE,
  t: (message) => message,
});

export function LanguageProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const value = useMemo(
    () => ({ locale, t: (message: string, values?: Record<string, string | number>) => translate(locale, message, values) }),
    [locale],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
