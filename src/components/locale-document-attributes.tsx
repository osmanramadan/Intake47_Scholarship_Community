"use client";

import { useLayoutEffect } from "react";
import type { Locale } from "@/lib/i18n";

export function LocaleDocumentAttributes({ locale }: { locale: Locale }) {
  useLayoutEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);

  return null;
}
