import { redirect } from "next/navigation";
import { getCachedServerSession } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import { PollForm } from "@/components/poll-form";
import { DeletePollButton } from "@/components/delete-poll-button";
import { prisma } from "@/lib/prisma";
import { getLocale } from "@/lib/locale";
import { translate } from "@/lib/i18n";

export const instant = false;

export default async function AdminPollsPage() {
  const session = await getCachedServerSession();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");
  const locale = await getLocale();
  const t = (message: string, values?: Record<string, string | number>) => translate(locale, message, values);
  const dateLocale = locale === "ar" ? "ar-EG" : "en-US";

  const polls = await prisma.poll.findMany({
    orderBy: { createdAt: "desc" },
    include: { options: { include: { _count: { select: { votes: true } } } } },
  });

  return (
    <main className="min-h-screen bg-[#f5f6f7] text-[#202124]">
      <SiteHeader />
      <section className="mx-auto max-w-[980px] px-4 pb-16 pt-10 sm:px-6 sm:pt-12">
        <a href="/admin" className="text-sm font-bold text-[#a32332] hover:underline">{t("← Back to admin")}</a>
        <div className="mt-8">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#a32332]">{t("Poll administration")}</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">{t("Create a community poll.")}</h1>
          <p className="mt-3 text-lg text-slate-600">{t("Add a clear question, answer options, and an optional image for students.")}</p>
        </div>
        <div className="mt-9 bg-white p-5 shadow-sm sm:p-9">
          <PollForm />
        </div>
        <section className="mt-12">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">{t("Results")}</p>
              <h2 className="mt-2 text-2xl font-bold">{t("Poll analysis")}</h2>
            </div>
            <span className="text-sm text-slate-500">{t(polls.length === 1 ? "{count} poll" : "{count} polls", { count: polls.length })}</span>
          </div>
          {polls.length > 0 ? (
            <div className="mt-5 space-y-3">
              {polls.map((poll) => {
                const voteCount = poll.options.reduce((total, option) => total + option._count.votes, 0);
                return (
                  <article key={poll.id} className="flex flex-col justify-between gap-4 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
                    <div>
                      <h3 className="font-bold">{poll.title}</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {t("Added {date}", { date: poll.createdAt.toLocaleDateString(dateLocale) })} · {t(poll.status.toLowerCase())} · {t(voteCount === 1 ? "{count} vote" : "{count} votes", { count: voteCount })} · {t(poll.options.length === 1 ? "{count} option" : "{count} options", { count: poll.options.length })}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                      <a href={`/admin/polls/${poll.id}`} className="text-sm font-bold text-[#a32332] hover:underline">{t("View analysis →")}</a>
                      <DeletePollButton pollId={poll.id} title={poll.title} />
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="mt-5 bg-white p-6 text-sm text-slate-600 shadow-sm">{t("No polls have been created yet.")}</p>
          )}
        </section>
      </section>
    </main>
  );
}
