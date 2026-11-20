import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/site-header";
import { PollCard } from "@/components/poll-card";
import { getLocale } from "@/lib/locale";
import { translate } from "@/lib/i18n";

export const instant = false;

export default async function PollsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const locale = await getLocale();
  const t = (message: string) => translate(locale, message);

  const polls = await prisma.poll.findMany({
    where: {
      status: "OPEN",
      OR: [{ deadline: null }, { deadline: { gt: new Date() } }],
    },
    orderBy: { createdAt: "asc" },
    include: {
      options: { orderBy: { sortOrder: "asc" }, include: { _count: { select: { votes: true } } } },
      votes: { where: { userId: session.user.id }, select: { optionId: true } },
    },
  });

  return (
    <main className="min-h-screen bg-[#f5f6f7] text-[#202124]">
      <SiteHeader />
      <section className="mx-auto max-w-[980px] px-4 pb-16 pt-10 sm:px-6 sm:pt-12">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#a32332]">{t("Community polls")}</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">{t("Have your say.")}</h1>
        <p className="mt-3 max-w-2xl text-lg text-slate-600">{t("Vote on the decisions that shape your scholarship community.")}</p>

        {polls.length > 0 ? (
          <div className="mt-9 space-y-5">
            {polls.map((poll) => (
              <PollCard
                key={poll.id}
                poll={{
                  id: poll.id,
                  title: poll.title,
                  description: poll.description,
                  imageUrl: poll.imageUrl,
                  deadline: poll.deadline?.toISOString() ?? null,
                  allowVoteChange: poll.allowVoteChange,
                  showResultsBeforeClose: poll.showResultsBeforeClose,
                  selectedOptionId: poll.votes[0]?.optionId ?? null,
                  options: poll.options.map((option) => ({ id: option.id, text: option.text, votes: option._count.votes })),
                }}
              />
            ))}
          </div>
        ) : (
          <div className="mt-9 bg-white p-10 text-center shadow-sm">
            <h2 className="text-2xl font-bold">{t("No active polls right now")}</h2>
            <p className="mt-3 text-slate-600">{t("New community questions will appear here when an administrator publishes them.")}</p>
          </div>
        )}
      </section>
    </main>
  );
}
