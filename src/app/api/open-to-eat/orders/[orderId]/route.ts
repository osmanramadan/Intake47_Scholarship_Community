import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const editOrderSchema = z.object({
  items: z.array(z.object({
    name: z.string().trim().min(1).max(150),
    price: z.string().trim().regex(/^\d+(?:\.\d{1,2})?$/).refine(
      (value) => Number(value) > 0 && Number(value) <= 9_999_999_999.99,
      "Enter a valid menu price.",
    ),
    quantity: z.number().int().min(1).max(50),
  })).min(1).max(20),
});

async function getEditableOrder(orderId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { session: null, order: null };

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      session: {
        select: {
          status: true,
          deadline: true,
          menu: { select: { isActive: true } },
        },
      },
    },
  });
  if (!order || order.userId !== session.user.id) return { session, order: null };

  if (order.status !== "SUBMITTED" ||
      order.session.status !== "OPEN" ||
      !order.session.menu.isActive ||
      (order.session.deadline && order.session.deadline <= new Date())) {
    return { session, order: null };
  }

  return { session, order };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "You must be signed in to edit your order." }, { status: 401 });

  const { orderId } = await params;
  const parsed = editOrderSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid order." }, { status: 400 });

  const { order } = await getEditableOrder(orderId);
  if (!order) return NextResponse.json({ error: "This order cannot be edited." }, { status: 404 });

  const updated = await prisma.$transaction(async (transaction) => {
    await transaction.orderItem.deleteMany({ where: { orderId } });
    await transaction.order.update({
      where: { id: orderId },
      data: {
        items: {
          create: parsed.data.items.map((item) => ({
            itemName: item.name,
            quantity: item.quantity,
            unitPrice: new Prisma.Decimal(item.price),
          })),
        },
      },
      include: { items: true },
    });
    return transaction.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: true },
    });
  });

  const total = updated.items.reduce((sum, item) => sum + item.unitPrice.toNumber() * item.quantity, 0);
  return NextResponse.json({
    order: {
      id: updated.id,
      submittedAt: updated.submittedAt?.toISOString() ?? updated.updatedAt.toISOString(),
      total,
      items: updated.items.map((item) => ({
        itemName: item.itemName,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toString(),
      })),
    },
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "You must be signed in to delete your order." }, { status: 401 });

  const { orderId } = await params;
  const { order } = await getEditableOrder(orderId);
  if (!order) return NextResponse.json({ error: "This order cannot be deleted." }, { status: 404 });

  await prisma.order.delete({ where: { id: orderId } });
  return NextResponse.json({ id: orderId });
}
