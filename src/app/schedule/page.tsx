import { redirect } from "next/navigation";
import { getCachedServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/site-header";
import { ZoomableImage } from "@/components/zoomable-image";
import { getLocale } from "@/lib/locale";
import { translate } from "@/lib/i18n";

export const instant = false;

export default async function SchedulePage() {
  const session = await getCachedServerSession();
  if (!session) redirect("/login");
  const locale = await getLocale();
  const t = (message: string) => translate(locale, message);
  const dateLocale = locale === "ar" ? "ar-EG" : "en-US";

  const schedules = await prisma.courseSchedule.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="min-h-screen bg-[#f5f6f7] text-[#202124]">
      <SiteHeader />
      <section className="mx-auto max-w-[1180px] px-4 pb-16 pt-10 sm:px-6 sm:pt-12">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#a32332]">{t("Weekly Table")}</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">{t("Weekly course table.")}</h1>
        <p className="mt-3 max-w-2xl text-lg text-slate-600">{t("View the timetable for each published week. The latest weekly table appears first.")}</p>

        {schedules.length > 0 ? (
          <div className="mt-9 space-y-6">
            {schedules.map((schedule) => (
              <article key={schedule.id} className="bg-white p-6 shadow-sm sm:p-8">
                <div className="border-b border-slate-200 pb-5">
                  <div className="text-center">
                    <h2 dir="auto" className="text-2xl font-bold">{schedule.title}</h2>
                    {(schedule.weekStart || schedule.weekEnd) && (
                      <p className="mt-2 text-center text-sm font-semibold text-[#a32332]">
                        {schedule.weekStart?.toLocaleDateString(dateLocale) ?? ""}
                        {schedule.weekStart && schedule.weekEnd ? " – " : ""}
                        {schedule.weekEnd?.toLocaleDateString(dateLocale) ?? ""}
                      </p>
                    )}
                    {schedule.description && <p dir="auto" className="mx-auto mt-3 max-w-2xl text-center leading-6 text-slate-600">{schedule.description}</p>}
                  </div>
                  <div className="mt-4 flex justify-end">
                    <a href={schedule.fileUrl} target="_blank" rel="noreferrer" className="text-sm font-bold text-[#a32332] hover:underline">
                      {t("Open original file ↗")}
                    </a>
                  </div>
                </div>
                {schedule.fileType.startsWith("image/") ? (
                  <ZoomableImage src={schedule.fileUrl} alt={schedule.title} />
                ) : (
                  <div className="mt-6">
                    <iframe src={schedule.fileUrl} title={schedule.title} className="h-[75vh] min-h-[480px] w-full border border-slate-200" />
                    <p className="mt-2 text-sm text-slate-500">{t("If the PDF does not appear here, use “Open original file”.")}</p>
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-9 bg-white p-10 text-center shadow-sm">
            <h2 className="text-2xl font-bold">{t("No weekly table yet")}</h2>
            <p className="mt-3 text-slate-600">{t("The timetable will appear here after an administrator publishes it.")}</p>
          </div>
        )}
      </section>
    </main>
  );
}
