import Image from "next/image";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import { getLocale } from "@/lib/locale";
import { translate } from "@/lib/i18n";

export const instant = false;

const features = [
  {
    number: "01",
    title: "Plan together",
    description: "Keep the weekly table, group updates, and important dates easy to find.",
    href: "/schedule",
  },
  {
    number: "02",
    title: "Open to eat 😊",
    description: "Open a post, enter the dishes, prices, and quantities you want, and submit your order for that post.",
    href: "/open-to-eat",
  },
  {
    number: "03",
    title: "Decide as one",
    description: "Create polls and make group decisions with clear, simple voting.",
    href: "/polls",
  },
];

export default async function Home() {
  const session = await getServerSession(authOptions);
  const locale = await getLocale();
  const t = (message: string) => translate(locale, message);
  const firstName = session?.user.name.split(" ")[0];

  return (
    <main className="min-h-screen bg-[#f5f6f7] text-[#202124]">
      <SiteHeader />

      <section className="mx-auto max-w-[1180px] px-4 pb-16 pt-10 sm:px-6 sm:pt-14">
        <div className="grid items-start gap-10 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <p className="inline-flex rounded-full bg-[#f8e9eb] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#7d2632]">{t("Built for your community")}</p>
            <h1 className="mt-7 max-w-2xl text-4xl font-black leading-[1.08] tracking-tight sm:text-6xl">{t("Make everyday life feel more connected.")}</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">{t("One friendly space for scholarship students to plan the week, order food together, vote on what matters, and stay in the loop.")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={session ? "/dashboard" : "/register"} className="rounded-md bg-[#c92335] px-5 py-3 text-sm font-bold text-white hover:bg-[#a91d2c]">{t(session ? "Open your dashboard" : "Get started free")}</a>
            </div>
          </div>
          <div className="bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 pb-5">
              <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{t("Today's community")}</p><h2 className="mt-2 text-2xl font-bold">{t("Good things, organized.")}</h2></div>
              <span className="rounded-full bg-[#f8e9eb] px-3 py-1 text-xs font-bold text-[#7d2632]">{t("Live")}</span>
            </div>
            <div className="mt-5 bg-[#f8e9eb] p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7d2632]">{t("Weekly Table")}</p>
              <div className="mt-2 flex items-center justify-between gap-4"><h3 className="text-2xl font-bold">{t("See this week's timetable.")}</h3><span className="text-4xl" aria-hidden="true">📅</span></div>
              <Link href="/schedule" className="mt-6 inline-block rounded-md bg-[#a32332] px-4 py-2 text-sm font-bold text-white hover:bg-[#871d2a]">{t("View weekly table →")}</Link>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-4">
              <div className="border border-slate-200 p-4"><p className="text-2xl font-black text-[#a32332]">01</p><p className="mt-4 font-bold">{t("This week")}</p><p className="mt-1 text-sm text-slate-500">{t("Weekly Table updates")}</p></div>
              <div className="border border-slate-200 p-4"><p className="text-2xl font-black text-[#a32332]">02</p><p className="mt-4 font-bold">{t("Group pulse")}</p><p className="mt-1 text-sm text-slate-500">{t("Active polls")}</p></div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-[1180px] px-4 py-12 sm:px-6 sm:py-16">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7d2632]">{t("Everything in one place")}</p>
          <h2 className="mt-3 text-3xl font-bold">{t("Less chasing. More doing.")}</h2>
          <p className="mt-3 max-w-2xl text-slate-600">{t("The essentials your group uses every day, designed to be quick to understand and easy to share.")}</p>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {features.map((feature) => (
              <a key={feature.title} href={feature.href} className="border border-slate-200 bg-[#fafafa] p-6 transition hover:-translate-y-1 hover:border-[#c98b92] hover:shadow-md">
                <span className="text-2xl font-black text-[#a32332]">{feature.number}</span>
                <h3 className="mt-5 text-xl font-bold">{t(feature.title)}</h3>
                <p className="mt-3 leading-7 text-slate-600">{t(feature.description)}</p>
                <span className="mt-5 inline-block text-sm font-bold text-[#a32332]">{t("Learn more →")}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto grid max-w-[1180px] gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-2 lg:items-start">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7d2632]">{t("Designed for real life")}</p>
          <h2 className="mt-3 text-3xl font-bold">{t("Your group has enough to think about.")}</h2>
          <p className="mt-5 leading-8 text-slate-600">{t("Scholarship Community keeps the small details from becoming big distractions, so everyone knows what is happening next.")}</p>
          <div className="mt-7 space-y-5">
            {["Open the dashboard", "Take part", "Stay in sync"].map((title, index) => (
              <div key={title} className="flex gap-4"><span className="text-lg font-black text-[#a32332]">0{index + 1}</span><div><h3 className="font-bold">{t(title)}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{t(["See the latest weekly table, active polls, and food updates at a glance.", "Vote, choose your meal, and keep your own account details current.", "Get the right updates without searching through scattered messages."][index])}</p></div></div>
            ))}
          </div>
        </div>
        <div className="bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{t("Quick access")}</p>
          <h3 className="mt-2 text-2xl font-bold">{t("Order together")}</h3>
          <p className="mt-4 leading-7 text-slate-600">{t("Open a post, enter the dishes, prices, and quantities you want, and submit your order for that post.")}</p>
          <a href="/open-to-eat" className="mt-6 block rounded-md bg-[#a32332] px-5 py-3 text-center text-sm font-bold text-white hover:bg-[#871d2a]">{t("Open to eat 😊")}</a>
          <div className="mt-4 bg-[#f8e9eb] px-4 py-3 text-sm font-semibold text-[#7d2632]">{t("Choose from the menu image.")}</div>
        </div>
      </section>

      <section className="bg-[#202124] px-4 py-12 text-white sm:px-6 sm:py-14">
        <div className="mx-auto flex max-w-[1180px] flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#e7b5bb]">{t("Ready when you are")}</p><h2 className="mt-3 text-3xl font-bold">{t("Make the next week easier.")}</h2></div>
          <a href={session ? "/dashboard" : "/register"} className="rounded-md bg-[#c92335] px-5 py-3 text-sm font-bold text-white hover:bg-[#a91d2c]">{t(session ? "Open dashboard →" : "Create your account →")}</a>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1180px] flex-col justify-between gap-4 px-4 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:px-6">
          <div className="flex items-center gap-3"><Image src="/scholarship-logo.jfif" alt="" width={44} height={44} className="h-11 w-11 object-contain" /><span>Scholarship Community</span></div>
          <div className="flex gap-6"><a href="/dashboard" className="hover:text-[#a32332]">{t("Dashboard")}</a><a href="/account" className="hover:text-[#a32332]">{t("Account")}</a></div>
          <span>© 2026 Scholarship Community</span>
        </div>
      </footer>
    </main>
  );
}
