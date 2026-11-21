import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { cloudinary } from "@/lib/cloudinary";
import { combineOrderSummaryItems, orderSummaryItemsSchema } from "@/lib/order-summary";
import { prisma } from "@/lib/prisma";

const summaryUpdateSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("save"), items: orderSummaryItemsSchema }),
  z.object({ action: z.literal("reset") }),
  z.object({ action: z.literal("saveNotes"), notes: z.string().max(3000) }),
]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access is required." }, { status: 403 });
  }

  const { sessionId } = await params;
  let requestBody: unknown;
  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid summary data." }, { status: 400 });
  }

  const parsed = summaryUpdateSchema.safeParse(requestBody);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid summary data." }, { status: 400 });
  }

  if (parsed.data.action === "saveNotes") {
    const post = await prisma.orderingSession.findUnique({
      where: { id: sessionId },
      select: { id: true },
    });
    if (!post) return NextResponse.json({ error: "Open to eat post not found." }, { status: 404 });

    const notes = parsed.data.notes.trim();
    try {
      await prisma.orderingSession.update({
        where: { id: post.id },
        data: { summaryNotes: notes || null },
      });
    } catch (error) {
      console.error("Open to eat order notes save failed", error);
      return NextResponse.json({ error: "The order notes could not be saved. Please try again." }, { status: 500 });
    }
    return NextResponse.json({ notes, message: "Order notes saved." });
  }

  if (parsed.data.action === "reset") {
    const post = await prisma.orderingSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        orders: {
          where: { status: "SUBMITTED" },
          select: {
            items: { select: { itemName: true, quantity: true, unitPrice: true } },
          },
        },
      },
    });
    if (!post) return NextResponse.json({ error: "Open to eat post not found." }, { status: 404 });

    const items = combineOrderSummaryItems(post.orders.flatMap((order) =>
      order.items.map((item) => ({
        itemName: item.itemName,
        quantity: item.quantity,
        unitPriceCents: Math.round(item.unitPrice.toNumber() * 100),
      })),
    ));
    if (items.length === 0) {
      return NextResponse.json({ error: "There are no submitted orders to summarize." }, { status: 400 });
    }

    try {
      await prisma.orderingSession.update({
        where: { id: post.id },
        data: { summaryItems: Prisma.DbNull },
      });
    } catch (error) {
      console.error("Open to eat order summary reset failed", error);
      return NextResponse.json({ error: "The order summary could not be reset. Please try again." }, { status: 500 });
    }
    return NextResponse.json({ items, message: "Order summary restored from student orders." });
  }

  const post = await prisma.orderingSession.findUnique({
    where: { id: sessionId },
    select: { id: true },
  });
  if (!post) return NextResponse.json({ error: "Open to eat post not found." }, { status: 404 });

  const items = combineOrderSummaryItems(parsed.data.items);
  try {
    await prisma.orderingSession.update({
      where: { id: post.id },
      data: { summaryItems: items },
    });
  } catch (error) {
    console.error("Open to eat order summary save failed", error);
    return NextResponse.json({ error: "The order summary could not be saved. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ items, message: "Order summary saved." });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access is required." }, { status: 403 });
  }

  const { sessionId } = await params;
  const post = await prisma.orderingSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      menuId: true,
      menu: {
        select: {
          imageUrl: true,
          imagePublicId: true,
          attachments: { select: { publicId: true, resourceType: true, url: true } },
          foodItems: { select: { imageUrl: true, imagePublicId: true } },
        },
      },
    },
  });
  if (!post) return NextResponse.json({ error: "Open to eat post not found." }, { status: 404 });

  const otherSessionCount = await prisma.orderingSession.count({
    where: { menuId: post.menuId, id: { not: post.id } },
  });
  if (
    otherSessionCount === 0 &&
    (
      Boolean(post.menu.imageUrl && !post.menu.imagePublicId) ||
      post.menu.attachments.some((attachment) => !attachment.publicId) ||
      post.menu.foodItems.some((item) => item.imageUrl && !item.imagePublicId)
    )
  ) {
    return NextResponse.json({ error: "An Open to eat image is missing its Cloudinary ID. The post and its orders were kept." }, { status: 502 });
  }
  const imagePublicIds = otherSessionCount === 0
    ? [...new Set([
      ...post.menu.attachments.map((attachment) => attachment.publicId),
      post.menu.imagePublicId,
      ...post.menu.foodItems.map((item) => item.imagePublicId),
    ].filter((id): id is string => Boolean(id)))]
    : [];

  if (imagePublicIds.length > 0) {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return NextResponse.json({ error: "Open to eat image deletion is not configured. The post and its orders were kept." }, { status: 503 });
    }

    const cleanupResults = await Promise.all(imagePublicIds.map(async (publicId) => {
      try {
        const attachment = post.menu.attachments.find((item) => item.publicId === publicId);
        const resourceType = attachment?.resourceType === "raw" ? "raw" : "image";
        const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
        if (result.result === "ok" || result.result === "not found") return true;
        console.error("Cloudinary did not confirm Open to eat image deletion", result.result);
        return false;
      } catch (error) {
        console.error("Open to eat image cleanup failed in Cloudinary", error);
        return false;
      }
    }));

    if (cleanupResults.some((success) => !success)) {
      return NextResponse.json({ error: "Could not delete all Open to eat images. The post and its orders were kept." }, { status: 502 });
    }
  }

  try {
    await prisma.$transaction(async (transaction) => {
      const orders = await transaction.order.findMany({
        where: { sessionId: post.id },
        select: { id: true },
      });
      await transaction.orderItem.deleteMany({
        where: { orderId: { in: orders.map((order) => order.id) } },
      });
      await transaction.order.deleteMany({ where: { sessionId: post.id } });
      await transaction.orderingSession.delete({ where: { id: post.id } });

      const remainingSessions = await transaction.orderingSession.count({ where: { menuId: post.menuId } });
      if (remainingSessions > 0) return;

      await transaction.menu.delete({ where: { id: post.menuId } });
    });
  } catch (error) {
    console.error("Open to eat post deletion failed", error);
    if (imagePublicIds.length > 0) {
      return NextResponse.json({ error: "The images were deleted, but the post could not be deleted. Please retry." }, { status: 500 });
    }
    return NextResponse.json({ error: "The post and its orders could not be deleted. Please try again." }, { status: 500 });
  }

  return NextResponse.json({
    deleted: true,
    message: "Open to eat post and all its orders deleted.",
  });
}
