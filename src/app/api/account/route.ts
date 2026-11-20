import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { cloudinary } from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";

function uploadProfileImage(buffer: Buffer) {
  return new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "scholarship-community/profiles", resource_type: "image" },
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

const nameSchema = z.string().trim().min(2, "Name must contain at least 2 characters").max(100);
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "You must be signed in" }, { status: 401 });
  }

  const formData = await request.formData();
  const nameResult = nameSchema.safeParse(formData.get("fullName"));
  if (!nameResult.success) {
    return NextResponse.json({ error: nameResult.error.issues[0]?.message ?? "Invalid name" }, { status: 400 });
  }

  const removeImage = formData.get("removeImage") === "true";
  const image = formData.get("profileImage");
  const hasImage = image instanceof File && image.size > 0;
  if (hasImage && (!allowedImageTypes.has(image.type) || image.size > MAX_IMAGE_SIZE)) {
    return NextResponse.json({ error: "Use a JPG, PNG, or WebP image smaller than 5 MB." }, { status: 400 });
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { profileImagePublicId: true },
  });
  if (!currentUser) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  let profileImageUrl: string | null | undefined;
  let profileImagePublicId: string | null | undefined;
  let uploadedPublicId: string | undefined;

  try {
    if (hasImage) {
      if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        return NextResponse.json({ error: "Image uploads are not configured yet." }, { status: 503 });
      }
      const upload = await uploadProfileImage(Buffer.from(await image.arrayBuffer()));
      profileImageUrl = upload.secure_url;
      profileImagePublicId = upload.public_id;
      uploadedPublicId = upload.public_id;
    } else if (removeImage) {
      profileImageUrl = null;
      profileImagePublicId = null;
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        fullName: nameResult.data,
        ...(profileImageUrl !== undefined ? { profileImageUrl } : {}),
        ...(profileImagePublicId !== undefined ? { profileImagePublicId } : {}),
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        profileImageUrl: true,
      },
    });

    if (currentUser.profileImagePublicId && (hasImage || removeImage)) {
      try {
        await cloudinary.uploader.destroy(currentUser.profileImagePublicId, { resource_type: "image" });
      } catch (cleanupError) {
        console.error("Previous profile image cleanup failed", cleanupError);
      }
    }

    return NextResponse.json({ user });
  } catch (error) {
    if (uploadedPublicId) {
      await cloudinary.uploader.destroy(uploadedPublicId, { resource_type: "image" }).catch(() => undefined);
    }
    console.error("Profile update failed", error);
    const message = error instanceof Error ? error.message : "Unknown profile update error";
    return NextResponse.json({ error: `We could not update your profile: ${message}` }, { status: 500 });
  }
}
