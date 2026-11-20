import type { ReactNode } from "react";
import { getLocale } from "@/lib/locale";
import { LanguageProvider } from "@/components/language-provider";
import { LocaleDocumentAttributes } from "@/components/locale-document-attributes";

export async function LocaleBoundary({ children }: { children: ReactNode }) {
  const locale = await getLocale();

  return (
    <LanguageProvider locale={locale}>
      <LocaleDocumentAttributes locale={locale} />
      <div dir={locale === "ar" ? "rtl" : "ltr"}>{children}</div>
    </LanguageProvider>
  );
}
