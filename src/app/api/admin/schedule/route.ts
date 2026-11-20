import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { cloudinary } from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";

const scheduleSchema = z.object({
  title: z.string().trim().min(2).max(150),
  description: z.string().trim().max(1000).optional(),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  weekEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

type ScheduleResourceType = "image" | "raw";

function uploadScheduleFile(buffer: Buffer) {
  return new Promise<{ secure_url: string; public_id: string; resource_type: ScheduleResourceType }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "scholarship-community/schedules", resource_type: "auto" },
      (error, result) => {
        if (error || !result) {
          const uploadError = error && typeof error === "object" && "error" in error ? error.error : error;
          const message = uploadError && typeof uploadError.message === "string"
            ? `${uploadError.message}${uploadError.http_code ? ` (HTTP ${uploadError.http_code})` : ""}`
            : "Cloudinary did not return an upload result";
          reject(new Error(message));
          return;
        }
        if (result.resource_type !== "image" && result.resource_type !== "raw") {
          reject(new Error(`Unsupported Cloudinary resource type: ${result.resource_type}`));
          return;
        }
        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
          resource_type: result.resource_type,
        });
      },
    );
    stream.end(buffer);
  });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Admin access is required." }, { status: 403 });

  const formData = await request.formData();
  const parsed = scheduleSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    weekStart: formData.get("weekStart") || undefined,
    weekEnd: formData.get("weekEnd") || undefined,
  });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid schedule details." }, { status: 400 });

  const startOfWeek = parsed.data.weekStart ? new Date(`${parsed.data.weekStart}T00:00:00.000Z`) : null;
  const endOfWeek = parsed.data.weekEnd ? new Date(`${parsed.data.weekEnd}T00:00:00.000Z`) : null;
  const invalidStart = startOfWeek && (Number.isNaN(startOfWeek.getTime()) || startOfWeek.toISOString().slice(0, 10) !== parsed.data.weekStart);
  const invalidEnd = endOfWeek && (Number.isNaN(endOfWeek.getTime()) || endOfWeek.toISOString().slice(0, 10) !== parsed.data.weekEnd);
  if (invalidStart || invalidEnd || (startOfWeek && endOfWeek && endOfWeek < startOfWeek)) {
    return NextResponse.json({ error: "Choose a valid week range; the end date must not be before the start date." }, { status: 400 });
  }
  const weekStart = startOfWeek;
  const weekEnd = endOfWeek ? new Date(endOfWeek.getTime() + 24 * 60 * 60 * 1000 - 1) : null;

  const file = formData.get("file");
  const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Choose a timetable file to upload." }, { status: 400 });
  }
  if (!allowedTypes.has(file.type) || file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Use a PDF, JPG, PNG, or WebP file smaller than 10 MB." }, { status: 400 });
  }
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    return NextResponse.json({ error: "File uploads are not configured." }, { status: 503 });
  }

  let uploaded: { secure_url: string; public_id: string; resource_type: ScheduleResourceType } | undefined;
  try {
    uploaded = await uploadScheduleFile(Buffer.from(await file.arrayBuffer()));
    await prisma.courseSchedule.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description || null,
        weekStart,
        weekEnd,
        fileUrl: uploaded.secure_url,
        filePublicId: uploaded.public_id,
        fileName: file.name,
        fileType: file.type,
      },
    });
    return NextResponse.json({ message: "Weekly schedule published and is now available to students." }, { status: 201 });
  } catch (error) {
    if (uploaded) {
      await cloudinary.uploader.destroy(uploaded.public_id, { resource_type: uploaded.resource_type }).catch(() => undefined);
    }
    console.error("Weekly schedule upload failed", error);
    const detail = error instanceof Error ? error.message.slice(0, 300) : "Unknown error";
    return NextResponse.json({ error: `Could not publish the schedule: ${detail}` }, { status: 500 });
  }
}
