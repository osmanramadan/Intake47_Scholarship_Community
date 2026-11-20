import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { cloudinary } from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ pollId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access is required." }, { status: 403 });
  }

  const { pollId } = await params;
  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
    select: { id: true, imagePublicId: true },
  });
  if (!poll) return NextResponse.json({ error: "Poll not found." }, { status: 404 });

  if (poll.imagePublicId) {
    try {
      const result = await cloudinary.uploader.destroy(poll.imagePublicId, { resource_type: "image" });
      if (result.result !== "ok" && result.result !== "not found") {
        console.error("Poll image cleanup returned an unexpected result", result.result);
        return NextResponse.json({ error: "Cloudinary did not confirm image deletion. The poll and its votes were kept." }, { status: 502 });
      }
    } catch (error) {
      console.error("Poll image cleanup failed", error);
      return NextResponse.json({ error: "Could not delete the poll image from Cloudinary. The poll and its votes were kept." }, { status: 502 });
    }
  }

  try {
    await prisma.poll.delete({ where: { id: poll.id } });
  } catch (error) {
    console.error("Poll deletion failed after image cleanup", error);
    return NextResponse.json({ error: "The image was removed, but the poll could not be deleted. Please retry." }, { status: 500 });
  }

  return NextResponse.json({ message: "Poll and all its votes deleted." });
}
