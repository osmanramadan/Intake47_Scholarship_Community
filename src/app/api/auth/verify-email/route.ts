import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = await request.json();
  const token = typeof body.token === "string" ? body.token : "";
  if (!token) {
    return NextResponse.json({ error: "Verification token is required" }, { status: 400 });
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const verification = await prisma.verificationToken.findUnique({
    where: { tokenHash },
  });

  if (!verification || verification.expiresAt < new Date()) {
    return NextResponse.json({ error: "The verification link is invalid or expired" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: verification.userId },
      data: {
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
      },
    }),
    prisma.verificationToken.deleteMany({
      where: { userId: verification.userId },
    }),
  ]);

  return NextResponse.json({ message: "Email verified successfully" });
}
