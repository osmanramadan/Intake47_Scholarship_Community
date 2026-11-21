import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { cloudinary } from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ scheduleId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access is required." }, { status: 403 });
  }

  const { scheduleId } = await params;
  const schedule = await prisma.courseSchedule.findUnique({
    where: { id: scheduleId },
    select: { id: true, filePublicId: true, fileUrl: true },
  });
  if (!schedule) return NextResponse.json({ error: "Weekly table not found." }, { status: 404 });
  if (schedule.fileUrl && !schedule.filePublicId) {
    return NextResponse.json({ error: "The timetable file is missing its Cloudinary ID. The weekly table was kept." }, { status: 502 });
  }

  if (schedule.filePublicId) {
    try {
      const resourceType = schedule.fileUrl.includes("/raw/upload/") ? "raw" : "image";
      const result = await cloudinary.uploader.destroy(schedule.filePublicId, { resource_type: resourceType });
      if (result.result !== "ok" && result.result !== "not found") {
        console.error("Weekly table file cleanup returned an unexpected result", result.result);
        return NextResponse.json({ error: "Could not delete the timetable file. The weekly table was kept." }, { status: 502 });
      }
    } catch (error) {
      console.error("Weekly table file cleanup failed", error);
      return NextResponse.json({ error: "Could not delete the timetable file. The weekly table was kept." }, { status: 502 });
    }
  }

  try {
    await prisma.courseSchedule.delete({ where: { id: schedule.id } });
  } catch (error) {
    console.error("Weekly table deletion failed after file cleanup", error);
    return NextResponse.json({ error: "The file was deleted, but the weekly table could not be deleted. Please retry." }, { status: 500 });
  }

  return NextResponse.json({ message: "Weekly table deleted." });
}
