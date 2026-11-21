import { redirect } from "next/navigation";
import { getCachedServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/site-header";
import { getLocale } from "@/lib/locale";
import { translate } from "@/lib/i18n";

export const instant = false;

const areas = [
  { id: "users", title: "Users", description: "View all accounts, suspend access, reactivate, or delete users.", href: "/admin/users", accent: "01" },
  { id: "food", title: "Open to eat posts", description: "Publish one menu image and review orders grouped by post.", href: "/admin/food", accent: "02" },
  { id: "polls", title: "Polls", description: "Create, publish, close, and review community votes.", href: "/admin/polls", accent: "03" },
  { id: "schedule", title: "Weekly Table", description: "Upload and manage the weekly course timetable.", href: "/admin/schedule", accent: "04" },
  { id: "notifications", title: "Notifications", description: "Send important updates to students.", href: "/admin/notifications", accent: "05" },
];

export default async function AdminPage() {
  const session = await getCachedServerSession();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");
  const locale = await getLocale();
  const t = (message: string, values?: Record<string, string | number>) => translate(locale, message, values);

  const [users, activeMenus, polls, schedules, settings] = await Promise.all([
    prisma.user.count(),
    prisma.menu.count({ where: { isActive: true } }),
    prisma.poll.count({ where: { status: "OPEN" } }),
    prisma.courseSchedule.count(),
    prisma.groupSettings.findUnique({ where: { id: "default" }, select: { groupName: true } }),
  ]);

  const stats: [string, number][] = [
    ["Users", users],
    ["Live polls", polls],
    ["Open To Eat", activeMenus],
    ["Weekly Tables uploaded", schedules],
  ];

  return (
    <main className="min-h-screen bg-[#f5f6f7] text-[#202124]">
      <SiteHeader />
      <section className="mx-auto max-w-[1180px] px-4 pb-16 pt-10 sm:px-6 sm:pt-12">
        <div className="flex flex-col justify-between gap-5 border-b border-slate-200 pb-8 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#a32332]">{t("Administration")}</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">{t("Community control center")}</h1>
            <p className="mt-3 max-w-2xl text-lg text-slate-600">{t("Manage every part of {name} before students use it.", { name: settings?.groupName ?? t("Scholarship Community") })}</p>
          </div>
          <a href="/dashboard" className="text-sm font-bold text-[#a32332] hover:underline">{t("← Student dashboard")}</a>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map(([label, value]) => (
            <div key={label} className="bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{t(label)}</p>
              <p className="mt-3 text-3xl font-black text-[#a32332]">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {areas.map((area) => (
            <a id={area.id} key={area.id} href={area.href} className="scroll-mt-8 border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[#c98b92] hover:shadow-md">
              <span className="text-2xl font-black text-[#a32332]">{area.accent}</span>
              <h2 className="mt-5 text-xl font-bold">{t(area.title)}</h2>
              <p className="mt-3 min-h-12 text-sm leading-6 text-slate-600">{t(area.description)}</p>
              <span className="mt-5 inline-block text-sm font-bold text-[#a32332]">{t("Manage {name} →", { name: t(area.title) })}</span>
            </a>
          ))}
        </div>

        <div className="mt-10">
          <div className="bg-[#202124] p-5 text-white sm:p-7">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#e7b5bb]">{t("Setup checklist")}</p>
            <h2 className="mt-3 text-2xl font-bold">{t("Before publishing Polls or Weekly Table")}</h2>
            <ul className="mt-5 space-y-3 text-sm text-slate-300">
              <li>{t("✓ Confirm student accounts and access")}</li>
              <li>{t("✓ Publish an Open to eat post with a menu image")}</li>
              <li>{t("✓ Set group location and currency")}</li>
              <li>{t("✓ Prepare notification rules for updates")}</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
