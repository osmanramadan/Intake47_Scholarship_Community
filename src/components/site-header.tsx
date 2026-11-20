import Image from "next/image";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getLocale } from "@/lib/locale";
import { translate } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";

export async function SiteHeader() {
  const session = await getServerSession(authOptions);
  const locale = await getLocale();
  const t = (message: string, values?: Record<string, string | number>) => translate(locale, message, values);

  return (
    <header className="border-b border-slate-200 bg-white">
      <div dir="ltr" className="relative mx-auto flex min-h-20 max-w-[1180px] items-center gap-3 px-4 sm:min-h-24 sm:px-6">
        <Link href="/" className="flex min-w-0 shrink-0 items-center gap-3">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white p-1 shadow-sm sm:h-16 sm:w-16">
            <Image src="/scholarship-logo.jfif" alt="Scholarship Community logo" width={64} height={64} priority className="h-full w-full object-contain" />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="text-sm font-extrabold leading-tight tracking-tight text-slate-900 sm:text-base">Scholarship Community</span>
            <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500 sm:text-[10px]">Mansoura Branch · Intake 47</span>
          </span>
        </Link>
        <nav dir={locale === "ar" ? "rtl" : "ltr"} className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-4 whitespace-nowrap text-xs font-bold text-slate-600 xl:flex xl:gap-5 xl:text-sm">
          <Link href="/dashboard" className="hover:text-[#a32332]">{t("Dashboard")}</Link>
          <Link href="/open-to-eat" className="hover:text-[#a32332]">{t("Open to eat 😊")}</Link>
          <Link href="/polls" className="hover:text-[#a32332]">{t("Polls")}</Link>
          <Link href="/schedule" className="hover:text-[#a32332]">{t("Weekly Table")}</Link>
        </nav>
        {session ? (
          <div dir={locale === "ar" ? "rtl" : "ltr"} className="ml-auto hidden shrink-0 items-center gap-3 xl:flex">
            {session.user.role === "ADMIN" && (
              <Link href="/admin" aria-label={t("Open admin dashboard")} className="rounded-md border border-[#c98b92] px-3 py-2 text-sm font-bold text-[#a32332] hover:bg-[#f8e9eb]">
                {t("Admin")}
              </Link>
            )}
            <Link href="/account" className="rounded-md bg-[#a32332] px-4 py-2 text-sm font-bold text-white hover:bg-[#871d2a]">{t("My account")}</Link>
            <LanguageSwitcher className="inline-flex items-center gap-2 rounded-md bg-[#12382b] px-3 py-2 text-sm font-bold text-white hover:bg-[#0d2f23]" />
          </div>
        ) : (
          <div dir={locale === "ar" ? "rtl" : "ltr"} className="ml-auto hidden shrink-0 items-center gap-5 xl:flex">
            <Link href="/login" className="text-sm font-bold text-slate-700">{t("Sign in")}</Link>
            <Link href="/register" className="rounded-md bg-[#a32332] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#871d2a]">{t("Join the community")}</Link>
            <LanguageSwitcher className="inline-flex items-center gap-2 rounded-md bg-[#12382b] px-3 py-2 text-sm font-bold text-white hover:bg-[#0d2f23]" />
          </div>
        )}
        <details className="group relative ml-auto shrink-0 xl:hidden">
          <summary aria-label={t("Open navigation menu")} className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a32332]">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
              <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </summary>
          <nav dir={locale === "ar" ? "rtl" : "ltr"} aria-label={t("Mobile navigation")} className="absolute right-0 top-full z-50 mt-2 max-h-[calc(100vh-6rem)] w-[min(88vw,20rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
            <div className="grid gap-1">
              <Link href="/dashboard" className="rounded-lg px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-[#f8e9eb] hover:text-[#a32332]">{t("Dashboard")}</Link>
              <Link href="/open-to-eat" className="rounded-lg px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-[#f8e9eb] hover:text-[#a32332]">{t("Open to eat 😊")}</Link>
              <Link href="/polls" className="rounded-lg px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-[#f8e9eb] hover:text-[#a32332]">{t("Polls")}</Link>
              <Link href="/schedule" className="rounded-lg px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-[#f8e9eb] hover:text-[#a32332]">{t("Weekly Table")}</Link>
              {session ? (
                <>
                  {session.user.role === "ADMIN" && <Link href="/admin" className="rounded-lg px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-[#f8e9eb] hover:text-[#a32332]">{t("Admin")}</Link>}
                  <Link href="/account" className="rounded-lg px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-[#f8e9eb] hover:text-[#a32332]">{t("My account")}</Link>
                </>
              ) : (
                <>
                  <Link href="/login" className="rounded-lg px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-[#f8e9eb] hover:text-[#a32332]">{t("Sign in")}</Link>
                  <Link href="/register" className="rounded-lg bg-[#a32332] px-4 py-3 text-sm font-bold text-white hover:bg-[#871d2a]">{t("Join the community")}</Link>
                </>
              )}
              <div className="border-t border-slate-100 pt-1">
                <LanguageSwitcher className="inline-flex items-center gap-2 rounded-md bg-[#12382b] px-4 py-3 text-sm font-bold text-white hover:bg-[#0d2f23]" />
              </div>
            </div>
          </nav>
        </details>
      </div>
    </header>
  );
}
