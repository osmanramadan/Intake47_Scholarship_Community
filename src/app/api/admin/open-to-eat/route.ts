import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { cloudinary } from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";

const postSchema = z.object({
  title: z.string().trim().min(2).max(150),
  description: z.string().trim().max(1000).optional(),
  deadline: z.string().optional(),
});

type UploadedMenuImage = { publicId: string };

function safeCloudinaryErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Cloudinary upload failed.";
  if (/invalid\s+api_key/i.test(message)) {
    return "Cloudinary rejected the API key (HTTP 401). Ensure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are from the same Cloudinary account.";
  }
  return message
    .replace(/\b(api_key|api_secret)\s*[:=]?\s*[^\s,;)]+/gi, "$1 [redacted]")
    .slice(0, 300);
}

function uploadMenuImage(buffer: Buffer) {
  return new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "scholarship-community/open-to-eat", resource_type: "image" },
      (error, result) => {
        if (error || !result) {
          const uploadError = error && typeof error === "object" && "error" in error ? error.error : error;
          const message = uploadError && typeof uploadError.message === "string"
            ? `${uploadError.message}${uploadError.http_code ? ` (HTTP ${uploadError.http_code})` : ""}`
            : "Cloudinary did not return an upload result";
          reject(new Error(safeCloudinaryErrorMessage(new Error(message))));
          return;
        }
        resolve({ secure_url: result.secure_url, public_id: result.public_id });
      },
    );
    stream.end(buffer);
  });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Admin access is required." }, { status: 403 });

  const formData = await request.formData();
  const parsed = postSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    deadline: formData.get("deadline") || undefined,
  });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid post details." }, { status: 400 });

  const deadline = parsed.data.deadline ? new Date(parsed.data.deadline) : null;
  if (deadline && (Number.isNaN(deadline.getTime()) || deadline <= new Date())) {
    return NextResponse.json({ error: "Choose an order deadline in the future." }, { status: 400 });
  }

  const image = formData.get("menuImage");
  if (!(image instanceof File) || image.size === 0) {
    return NextResponse.json({ error: "Choose a menu image to publish this post." }, { status: 400 });
  }
  if (!["image/jpeg", "image/png", "image/webp"].includes(image.type) || image.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Menu images must be JPG, PNG, or WebP files smaller than 5 MB." }, { status: 400 });
  }
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    return NextResponse.json({ error: "Menu image uploads are not configured." }, { status: 503 });
  }

  let uploadedImage: UploadedMenuImage | undefined;
  try {
    const upload = await uploadMenuImage(Buffer.from(await image.arrayBuffer()));
    uploadedImage = { publicId: upload.public_id };
    await prisma.menu.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description || null,
        imageUrl: upload.secure_url,
        imagePublicId: upload.public_id,
        isActive: true,
        sessions: {
          create: {
            title: parsed.data.title,
            status: "OPEN",
            deadline,
          },
        },
      },
    });
    return NextResponse.json({ message: "Open to eat post published. Students can order now." }, { status: 201 });
  } catch (error) {
    if (uploadedImage) {
      try {
        await cloudinary.uploader.destroy(uploadedImage.publicId, { resource_type: "image" });
      } catch (cleanupError) {
        console.error("Open to eat menu image cleanup failed", safeCloudinaryErrorMessage(cleanupError));
      }
    }
    const detail = safeCloudinaryErrorMessage(error);
    console.error("Open to eat post creation failed", detail);
    return NextResponse.json({ error: `Could not publish the Open to eat post: ${detail}` }, { status: 500 });
  }
}
