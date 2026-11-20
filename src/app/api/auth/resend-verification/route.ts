import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createTokenPair } from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/email";

const schema = z.object({ email: z.string().email() });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (user && user.status === "PENDING_VERIFICATION") {
    await prisma.verificationToken.deleteMany({ where: { userId: user.id } });
    const { token, tokenHash } = createTokenPair();
    await prisma.verificationToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    const appUrl = process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    await sendVerificationEmail(email, `${appUrl}/verify-email?token=${token}`);
  }

  return NextResponse.json({
    message: "If an unverified account exists, a new verification email has been sent.",
  });
}
