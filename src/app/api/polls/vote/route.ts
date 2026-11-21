import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const voteSchema = z.object({ pollId: z.string().min(1), optionId: z.string().min(1) });

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });

    let requestBody: unknown;
    try {
      requestBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Choose a valid poll option." }, { status: 400 });
    }
    const parsed = voteSchema.safeParse(requestBody);
    if (!parsed.success) return NextResponse.json({ error: "Choose a valid poll option." }, { status: 400 });

    const poll = await prisma.poll.findUnique({
      where: { id: parsed.data.pollId },
      select: { status: true, deadline: true, allowVoteChange: true, options: { where: { id: parsed.data.optionId }, select: { id: true } } },
    });
    if (!poll || poll.status !== "OPEN" || (poll.deadline && poll.deadline <= new Date())) {
      return NextResponse.json({ error: "This poll is no longer open." }, { status: 400 });
    }
    if (poll.options.length === 0) return NextResponse.json({ error: "That option does not belong to this poll." }, { status: 400 });

    const result = await prisma.$transaction(async (transaction) => {
      const existingVote = await transaction.vote.findUnique({
        where: { pollId_userId: { pollId: parsed.data.pollId, userId: session.user.id } },
      });
      if (existingVote && !poll.allowVoteChange) {
        return { conflict: true as const };
      }

      const vote = existingVote
        ? await transaction.vote.update({ where: { id: existingVote.id }, data: { optionId: parsed.data.optionId } })
        : await transaction.vote.create({ data: { pollId: parsed.data.pollId, optionId: parsed.data.optionId, userId: session.user.id } });

      const counts = await transaction.pollOption.findMany({
        where: { pollId: parsed.data.pollId },
        select: { id: true, _count: { select: { votes: true } } },
      });

      return { conflict: false as const, vote, counts };
    });

    if (result.conflict) {
      return NextResponse.json({ error: "You have already voted in this poll." }, { status: 409 });
    }

    return NextResponse.json({
      voteId: result.vote.id,
      counts: result.counts.map((option) => ({ optionId: option.id, votes: option._count.votes })),
    });
  } catch (error) {
    console.error("Poll vote submission failed", error);
    return NextResponse.json({ error: "Unable to submit your vote." }, { status: 500 });
  }
}
