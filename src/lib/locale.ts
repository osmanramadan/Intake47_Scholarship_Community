import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE_NAME, type Locale } from "@/lib/i18n";

export async function getLocale(): Promise<Locale> {
  const locale = (await cookies()).get(LOCALE_COOKIE_NAME)?.value;
  return locale === "ar" ? "ar" : DEFAULT_LOCALE;
}
