import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/site-header";
import { ScheduleForm } from "@/components/schedule-form";
import { getLocale } from "@/lib/locale";
import { translate } from "@/lib/i18n";

export const instant = false;

export default async function AdminSchedulePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");
  const locale = await getLocale();
  const t = (message: string) => translate(locale, message);
  const dateLocale = locale === "ar" ? "ar-EG" : "en-US";

  const schedules = await prisma.courseSchedule.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, weekStart: true, weekEnd: true, fileName: true },
  });

  return (
    <main className="min-h-screen bg-[#f5f6f7] text-[#202124]">
      <SiteHeader />
      <section className="mx-auto max-w-[980px] px-4 pb-16 pt-10 sm:px-6 sm:pt-12">
        <a href="/admin" className="text-sm font-bold text-[#a32332] hover:underline">{t("← Back to admin")}</a>
        <div className="mt-8">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#a32332]">{t("Weekly Table administration")}</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">{t("Publish a weekly table.")}</h1>
          <p className="mt-3 text-lg text-slate-600">{t("Upload a PDF or image. It will be available on the student Weekly Table page as soon as it is published.")}</p>
        </div>
        <div className="mt-9 bg-white p-5 shadow-sm sm:p-9">
          <ScheduleForm />
        </div>
        <section className="mt-12">
          <h2 className="text-2xl font-bold">{t("Published weekly tables")}</h2>
          <div className="mt-5 space-y-3">
            {schedules.map((schedule) => (
              <article key={schedule.id} className="flex flex-col justify-between gap-2 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
                <div>
                  <h3 className="font-bold">{schedule.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {schedule.weekStart?.toLocaleDateString(dateLocale) ?? ""}
                    {schedule.weekStart && schedule.weekEnd ? " – " : ""}
                    {schedule.weekEnd?.toLocaleDateString(dateLocale) ?? ""}
                    {schedule.weekStart || schedule.weekEnd ? " · " : ""}
                    {schedule.fileName}
                  </p>
                </div>
                <a href="/schedule" className="text-sm font-bold text-[#a32332] hover:underline">{t("View student page →")}</a>
              </article>
            ))}
            {schedules.length === 0 && <p className="bg-white p-6 text-sm text-slate-600 shadow-sm">{t("No weekly tables have been published yet.")}</p>}
          </div>
        </section>
      </section>
    </main>
  );
}
