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

type UploadedMenuFile = {
  url: string;
  publicId: string;
  resourceType: "image" | "raw";
  fileName: string;
  fileType: string;
};

function safeCloudinaryErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Cloudinary upload failed.";
  if (/invalid\s+api_key/i.test(message)) {
    return "Cloudinary rejected the API key (HTTP 401). Ensure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are from the same Cloudinary account.";
  }
  return message
    .replace(/\b(api_key|api_secret)\s*[:=]?\s*[^\s,;)]+/gi, "$1 [redacted]")
    .slice(0, 300);
}

function uploadMenuFile(file: File) {
  const resourceType = file.type === "application/pdf" ? "raw" : "image";
  return new Promise<UploadedMenuFile>((resolve, reject) => {
    file.arrayBuffer().then((bytes) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "scholarship-community/open-to-eat", resource_type: resourceType },
      (error, result) => {
        if (error || !result) {
          const uploadError = error && typeof error === "object" && "error" in error ? error.error : error;
          const message = uploadError && typeof uploadError.message === "string"
            ? `${uploadError.message}${uploadError.http_code ? ` (HTTP ${uploadError.http_code})` : ""}`
            : "Cloudinary did not return an upload result";
          reject(new Error(safeCloudinaryErrorMessage(new Error(message))));
          return;
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          resourceType,
          fileName: file.name,
          fileType: file.type,
        });
      },
    );
      stream.end(Buffer.from(bytes));
    }).catch(reject);
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

  const files = formData.getAll("menuFiles").filter((entry): entry is File => entry instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "Choose at least one menu image or PDF." }, { status: 400 });
  }
  if (files.length > 10) {
    return NextResponse.json({ error: "Add up to 10 menu files." }, { status: 400 });
  }
  for (const file of files) {
    if (!["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(file.type) || file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Menu files must be JPG, PNG, WebP, or PDF files smaller than 10 MB." }, { status: 400 });
    }
  }
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    return NextResponse.json({ error: "Menu image uploads are not configured." }, { status: 503 });
  }

  const uploadedFiles: UploadedMenuFile[] = [];
  try {
    for (const file of files) {
      uploadedFiles.push(await uploadMenuFile(file));
    }
    const firstImage = uploadedFiles.find((file) => file.resourceType === "image");
    await prisma.menu.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description || null,
        imageUrl: firstImage?.url ?? null,
        imagePublicId: firstImage?.publicId ?? null,
        isActive: true,
        sessions: {
          create: {
            title: parsed.data.title,
            status: "OPEN",
            deadline,
          },
        },
        attachments: {
          create: uploadedFiles.map((file, sortOrder) => ({
            url: file.url,
            publicId: file.publicId,
            resourceType: file.resourceType,
            fileName: file.fileName,
            fileType: file.fileType,
            sortOrder,
          })),
        },
      },
    });
    return NextResponse.json({ message: "Open to eat post published. Students can order now." }, { status: 201 });
  } catch (error) {
    await Promise.all(uploadedFiles.map((file) =>
      cloudinary.uploader.destroy(file.publicId, { resource_type: file.resourceType }).catch((cleanupError) => {
        console.error("Open to eat menu file cleanup failed", safeCloudinaryErrorMessage(cleanupError));
      }),
    ));
    const detail = safeCloudinaryErrorMessage(error);
    console.error("Open to eat post creation failed", detail);
    return NextResponse.json({ error: `Could not publish the Open to eat post: ${detail}` }, { status: 500 });
  }
}
