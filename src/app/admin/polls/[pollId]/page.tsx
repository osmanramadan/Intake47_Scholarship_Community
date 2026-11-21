import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCachedServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/site-header";
import { DeletePollButton } from "@/components/delete-poll-button";
import { ZoomableImage } from "@/components/zoomable-image";
import { getLocale } from "@/lib/locale";
import { translate } from "@/lib/i18n";
import { getCloudinaryImageUrl } from "@/lib/cloudinary-image";

export const instant = false;

export default async function AdminPollAnalysisPage({
  params,
}: {
  params: Promise<{ pollId: string }>;
}) {
  const session = await getCachedServerSession();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");
  const locale = await getLocale();
  const t = (message: string, values?: Record<string, string | number>) => translate(locale, message, values);
  const dateLocale = locale === "ar" ? "ar-EG" : "en-US";

  const { pollId } = await params;
  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
    include: {
      options: {
        orderBy: { sortOrder: "asc" },
        include: {
          votes: {
            orderBy: { createdAt: "asc" },
            include: { user: { select: { id: true, fullName: true, email: true, profileImageUrl: true } } },
          },
        },
      },
    },
  });
  if (!poll) notFound();

  const totalVotes = poll.options.reduce((total, option) => total + option.votes.length, 0);

  return (
    <main className="min-h-screen bg-[#f5f6f7] text-[#202124]">
      <SiteHeader />
      <section className="mx-auto max-w-[980px] px-4 pb-16 pt-10 sm:px-6 sm:pt-12">
        <Link href="/admin/polls" className="text-sm font-bold text-[#a32332] hover:underline">{t("← Back to poll administration")}</Link>
        <div className="mt-8 bg-white p-5 shadow-sm sm:p-9">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#a32332]">{t("Poll analysis")}</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight">{poll.title}</h1>
              {poll.description && <p className="mt-2 text-slate-600">{poll.description}</p>}
              <p className="mt-2 text-xs font-semibold text-slate-500">{t("Added {date}", { date: poll.createdAt.toLocaleString(dateLocale, { timeZone: "Africa/Cairo" }) })}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-fit rounded-full bg-[#f8e9eb] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#a32332]">{t(poll.status.toLowerCase())}</span>
              <DeletePollButton pollId={poll.id} title={poll.title} />
            </div>
          </div>

          {poll.imageUrl && <ZoomableImage src={poll.imageUrl} alt={poll.title} />}

          <div className="mt-7 grid gap-4 sm:grid-cols-3">
            <div className="bg-[#f5f6f7] p-5">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{t("Total votes")}</p>
              <p className="mt-2 text-3xl font-black text-[#a32332]">{totalVotes}</p>
            </div>
            <div className="bg-[#f5f6f7] p-5">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{t("Answer options")}</p>
              <p className="mt-2 text-3xl font-black text-[#a32332]">{poll.options.length}</p>
            </div>
            <div className="bg-[#f5f6f7] p-5">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{t("Closes")}</p>
              <p className="mt-2 text-lg font-bold">{poll.deadline ? poll.deadline.toLocaleString(dateLocale) : t("No deadline")}</p>
            </div>
          </div>
        </div>

        <div className="mt-7 space-y-5">
          {poll.options.map((option) => {
            const count = option.votes.length;
            const percentage = totalVotes === 0 ? 0 : Math.round((count / totalVotes) * 100);
            return (
              <section key={option.id} className="bg-white p-6 shadow-sm sm:p-8">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h2 className="text-xl font-bold">{option.text}</h2>
                  <p className="text-sm font-bold text-[#a32332]">{t(count === 1 ? "{count} vote" : "{count} votes", { count })} · {percentage}%</p>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-[#a32332]" style={{ width: `${percentage}%` }} />
                </div>
                <h3 className="mt-6 text-sm font-bold uppercase tracking-[0.12em] text-slate-500">{t("Voters")}</h3>
                {count > 0 ? (
                  <ul className="mt-3 divide-y divide-slate-100">
                    {option.votes.map((vote) => (
                      <li key={vote.user.id} className="flex flex-col justify-between gap-1 py-3 text-sm sm:flex-row sm:items-center">
                        <div className="flex items-center gap-3">
                          {vote.user.profileImageUrl ? (
                                        <img src={getCloudinaryImageUrl(vote.user.profileImageUrl, 80, 80)} alt={`${vote.user.fullName} profile`} loading="lazy" decoding="async" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                          ) : (
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f8e9eb] font-bold text-[#a32332]">
                              {vote.user.fullName.charAt(0).toUpperCase()}
                            </span>
                          )}
                          <span className="font-semibold">{vote.user.fullName}</span>
                        </div>
                        <span className="pl-[52px] text-slate-500 sm:pl-0">{vote.user.email}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">{t("No users have selected this option yet.")}</p>
                )}
              </section>
            );
          })}
        </div>
      </section>
    </main>
  );
}
