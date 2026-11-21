import { redirect } from "next/navigation";
import Link from "next/link";
import { getCachedServerSession } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import { getLocale } from "@/lib/locale";
import { translate } from "@/lib/i18n";

export const instant = false;

const cards = [
  ["01", "Open to eat 😊", "Browse the posted restaurant menu and order multiple dishes.", "/open-to-eat"],
  ["02", "Polls & elections", "Share your voice and help the community decide together.", "/polls"],
  ["03", "Weekly Table", "Keep classes, activities, and important dates in view.", "/schedule"],
  ["04", "My account", "Update your name, photo, and personal details.", "/account"],
];

export default async function DashboardPage() {
  const session = await getCachedServerSession();
  if (!session) redirect("/login");

  const locale = await getLocale();
  const t = (message: string, values?: Record<string, string | number>) => translate(locale, message, values);
  const firstName = session.user.name.split(" ")[0];

  return (
    <main className="min-h-screen bg-[#f5f6f7] text-[#202124]">
      <SiteHeader />

      <section className="mx-auto max-w-[1180px] px-4 pb-16 pt-10 sm:px-6 sm:pt-12">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-600">{t("Your space")}</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">{t("Welcome, {name}.", { name: firstName })}</h1>
            <p className="mt-3 text-lg text-slate-600">{t("Everything your community needs for a smoother week, all in one place.")}</p>
          </div>
          <Link href="/account" className="hidden rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold hover:border-[#a32332] sm:block">{t("Edit my profile →")}</Link>
        </div>

        <div className="mt-9 grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="bg-white p-5 shadow-sm sm:p-9">
            <div className="flex flex-col justify-between gap-5 border-b border-slate-200 pb-7 sm:flex-row sm:items-start">
              <div>
                <h2 className="text-2xl font-bold">{t("Your community dashboard")}</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">{t("Use the sections below to manage your meals, weekly table, group decisions, and profile.")}</p>
              </div>
              <Link href="/open-to-eat" className="rounded-md bg-[#c92335] px-4 py-2.5 text-center text-sm font-bold text-white hover:bg-[#a91d2c]">{t("Open to eat 😊")}</Link>
            </div>

            <h2 className="mt-9 text-xl font-bold">{t("Community sections")}</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {cards.map(([number, title, description, href]) => (
                <Link key={href} href={href} className="border border-slate-200 bg-[#fafafa] p-5 transition hover:-translate-y-0.5 hover:border-[#c98b92] hover:shadow-md">
                  <div className="flex items-center gap-3"><span className="text-2xl font-black text-[#a32332]">{number}</span><h3 className="font-bold">{t(title)}</h3></div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{t(description)}</p>
                  <span className="mt-4 inline-block text-sm font-bold text-[#a32332]">{t("Open section →")}</span>
                </Link>
              ))}
            </div>
          </div>

          <aside className="space-y-5">
            <div className="bg-[#202124] p-6 text-white">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#e7b5bb]">{t("This week")}</p>
              <h2 className="mt-3 text-2xl font-bold">{t("Stay in sync")}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">{t("Your community hub is ready for the latest updates.")}</p>
              <Link href="/schedule" className="mt-6 inline-block rounded-md bg-[#c92335] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#a91d2c]">{t("View weekly table →")}</Link>
            </div>
            <div className="bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">{t("Need help?")}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{t("Contact your administrator if you need help with an order, poll, or account.")}</p>
              <a href="mailto:osmanramadan840@gmail.com" className="mt-5 inline-block text-sm font-bold text-[#a32332]">{t("Contact administrator →")} (osmanramadan840@gmail.com)</a>
            </div>
            <div className="bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{t("Community pulse")}</p>
              <h2 className="mt-3 text-xl font-bold">{t("Have your say")}</h2>
              <p className="mt-2 text-sm text-slate-600">{t("Check active polls and help the group decide together.")}</p>
              <Link href="/polls" className="mt-4 inline-block text-sm font-bold text-[#a32332]">{t("Open active polls →")}</Link>
            </div>
          </aside>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1180px] flex-col justify-between gap-4 px-4 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:px-6">
          <span>{t("Scholarship Community")}</span>
          <div className="flex gap-6"><Link href="/" className="hover:text-[#a32332]">{t("Home")}</Link><Link href="/account" className="hover:text-[#a32332]">{t("Account")}</Link></div>
          <span>© 2026 {t("Scholarship Community")}</span>
        </div>
      </footer>
    </main>
  );
}
