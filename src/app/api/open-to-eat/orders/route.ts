import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const orderSchema = z.object({
  sessionId: z.string().min(1),
  items: z.array(z.object({
    name: z.string().trim().min(1).max(150),
    price: z.string().trim().regex(/^\d+(?:\.\d{1,2})?$/).refine(
      (value) => Number(value) > 0 && Number(value) <= 9_999_999_999.99,
      "Enter a valid menu price.",
    ),
    quantity: z.number().int().min(1).max(50),
  })).min(1).max(20),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "You must be signed in to order." }, { status: 401 });

  const parsed = orderSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid order." }, { status: 400 });

  const orderingSession = await prisma.orderingSession.findUnique({
    where: { id: parsed.data.sessionId },
    select: { id: true, menuId: true, status: true, deadline: true, menu: { select: { isActive: true } } },
  });
  if (!orderingSession || orderingSession.status !== "OPEN" || !orderingSession.menu.isActive ||
      (orderingSession.deadline && orderingSession.deadline <= new Date())) {
    return NextResponse.json({ error: "This food post is no longer accepting orders." }, { status: 400 });
  }

  const itemData = parsed.data.items.map((item) => ({
    itemName: item.name,
    quantity: item.quantity,
    unitPrice: new Prisma.Decimal(item.price),
  }));
  const submittedAt = new Date();
  const order = await prisma.order.create({
    data: {
      userId: session.user.id,
      sessionId: orderingSession.id,
      status: "SUBMITTED",
      submittedAt,
      items: { create: itemData },
    },
    include: { items: true },
  });

  const total = order.items.reduce((sum, item) => sum + item.unitPrice.toNumber() * item.quantity, 0);
  return NextResponse.json({
    order: {
      id: order.id,
      submittedAt: order.submittedAt?.toISOString() ?? submittedAt.toISOString(),
      total,
      items: order.items.map((item) => ({
        itemName: item.itemName,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toString(),
      })),
    },
  }, { status: 201 });
}
