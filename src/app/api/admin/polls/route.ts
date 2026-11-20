import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { cloudinary } from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";

function uploadPollImage(buffer: Buffer) {
  return new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "scholarship-community/polls", resource_type: "image" },
      (error, result) => {
        if (error || !result) {
          const uploadError = error && typeof error === "object" && "error" in error ? error.error : error;
          const message = uploadError && typeof uploadError.message === "string"
            ? `${uploadError.message}${uploadError.http_code ? ` (HTTP ${uploadError.http_code})` : ""}`
            : "Cloudinary did not return an upload result";
          reject(new Error(message));
          return;
        }
        resolve({ secure_url: result.secure_url, public_id: result.public_id });
      },
    );
    stream.end(buffer);
  });
}

const pollSchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(1000).optional(),
  options: z.array(z.string().trim().min(1).max(200)).min(2).max(20),
  deadline: z.string().optional(),
  publish: z.boolean(),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Admin access is required." }, { status: 403 });

  const formData = await request.formData();
  let rawOptions: unknown;
  try {
    rawOptions = JSON.parse(String(formData.get("options") ?? "[]"));
  } catch {
    return NextResponse.json({ error: "Poll options are invalid." }, { status: 400 });
  }
  const parsed = pollSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    options: rawOptions,
    deadline: formData.get("deadline") || undefined,
    publish: formData.get("publish") === "on",
  });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid poll details." }, { status: 400 });

  const deadline = parsed.data.deadline ? new Date(parsed.data.deadline) : null;
  if (deadline && Number.isNaN(deadline.getTime())) return NextResponse.json({ error: "Choose a valid close date." }, { status: 400 });
  if (deadline && deadline <= new Date()) return NextResponse.json({ error: "Close date must be in the future." }, { status: 400 });

  const image = formData.get("image");
  const hasImage = image instanceof File && image.size > 0;
  if (hasImage && (!["image/jpeg", "image/png", "image/webp"].includes(image.type) || image.size > 5 * 1024 * 1024)) {
    return NextResponse.json({ error: "Use a JPG, PNG, or WebP image smaller than 5 MB." }, { status: 400 });
  }

  let uploadedPublicId: string | undefined;
  let stage: "image upload" | "database save" = "image upload";
  try {
    let imageUrl: string | undefined;
    if (hasImage) {
      if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        return NextResponse.json({ error: "Image uploads are not configured yet." }, { status: 503 });
      }
      const upload = await uploadPollImage(Buffer.from(await image.arrayBuffer()));
      imageUrl = upload.secure_url;
      uploadedPublicId = upload.public_id;
    }

    stage = "database save";
    await prisma.poll.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description || null,
        imageUrl: imageUrl ?? null,
        imagePublicId: uploadedPublicId ?? null,
        status: parsed.data.publish ? "OPEN" : "DRAFT",
        deadline,
        options: { create: parsed.data.options.map((text, sortOrder) => ({ text, sortOrder })) },
      },
    });
    return NextResponse.json({ message: parsed.data.publish ? "Poll published successfully." : "Poll saved as a draft." }, { status: 201 });
  } catch (error) {
    if (uploadedPublicId) await cloudinary.uploader.destroy(uploadedPublicId, { resource_type: "image" }).catch(() => undefined);
    console.error("Admin poll creation failed", error);
    const detail = error instanceof Error ? error.message.slice(0, 300) : "Unknown error";
    const message = stage === "image upload"
      ? `Cloudinary image upload failed: ${detail}`
      : `Image uploaded, but the poll could not be saved: ${detail}`;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
