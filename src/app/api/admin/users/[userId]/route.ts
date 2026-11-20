import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { cloudinary } from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";

const statusSchema = z.object({ action: z.enum(["suspend", "reactivate"]) });

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  return session?.user?.role === "ADMIN" ? session : null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Admin access is required." }, { status: 403 });

  const { userId } = await params;
  if (userId === session.user.id) return NextResponse.json({ error: "You cannot suspend your own account." }, { status: 400 });

  const parsed = statusSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid account action." }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, status: true, emailVerifiedAt: true },
  });
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  if (parsed.data.action === "suspend") {
    if (user.status === "DISABLED") return NextResponse.json({ message: "This account is already suspended." });
    if (user.role === "ADMIN" && user.status === "ACTIVE") {
      const activeAdmins = await prisma.user.count({ where: { role: "ADMIN", status: "ACTIVE" } });
      if (activeAdmins <= 1) return NextResponse.json({ error: "You cannot suspend the last active administrator." }, { status: 400 });
    }
    await prisma.user.update({ where: { id: user.id }, data: { status: "DISABLED" } });
    return NextResponse.json({ message: "Account suspended." });
  }

  if (user.status !== "DISABLED") return NextResponse.json({ error: "This account is not suspended." }, { status: 400 });
  await prisma.user.update({
    where: { id: user.id },
    data: { status: user.emailVerifiedAt ? "ACTIVE" : "PENDING_VERIFICATION" },
  });
  return NextResponse.json({ message: "Account reactivated." });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Admin access is required." }, { status: 403 });

  const { userId } = await params;
  if (userId === session.user.id) return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, profileImagePublicId: true },
  });
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  if (user.role === "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) return NextResponse.json({ error: "You cannot delete the last administrator." }, { status: 400 });
  }

  if (user.profileImagePublicId) {
    try {
      const result = await cloudinary.uploader.destroy(user.profileImagePublicId, { resource_type: "image" });
      if (result.result !== "ok" && result.result !== "not found") {
        return NextResponse.json({ error: "Cloudinary did not confirm profile image deletion. The user account was kept." }, { status: 502 });
      }
    } catch (error) {
      console.error("User profile image cleanup failed", error);
      return NextResponse.json({ error: "Could not delete the user's image from Cloudinary. The account was kept." }, { status: 502 });
    }
  }

  try {
    await prisma.user.delete({ where: { id: user.id } });
  } catch (error) {
    console.error("User deletion failed after profile image cleanup", error);
    return NextResponse.json({ error: "The image was removed, but the account could not be deleted. Please retry." }, { status: 500 });
  }

  return NextResponse.json({ message: "User and account data deleted." });
}
