import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { combineOrderSummaryItems, orderSummaryItemsSchema } from "@/lib/order-summary";
import { SiteHeader } from "@/components/site-header";
import { ZoomableImage } from "@/components/zoomable-image";
import { DeleteOpenToEatPostButton } from "@/components/delete-open-to-eat-post-button";
import { OrderSummaryEditor } from "@/components/order-summary-editor";
import { getOpenToEatPostTitle } from "@/lib/open-to-eat";
import { getLocale } from "@/lib/locale";
import { translate } from "@/lib/i18n";
import { getCloudinaryImageUrl } from "@/lib/cloudinary-image";

export const instant = false;

export default async function AdminFoodPostOrdersPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");
  const locale = await getLocale();
  const t = (message: string, values?: Record<string, string | number>) => translate(locale, message, values);
  const dateLocale = locale === "ar" ? "ar-EG" : "en-US";

  const { sessionId } = await params;
  const [post, settings] = await Promise.all([
    prisma.orderingSession.findUnique({
      where: { id: sessionId },
      include: {
        menu: { select: { title: true, description: true, imageUrl: true } },
        orders: {
          where: { status: "SUBMITTED" },
          orderBy: { submittedAt: "desc" },
          include: {
            user: { select: { id: true, fullName: true, profileImageUrl: true } },
            items: true,
          },
        },
      },
    }),
    prisma.groupSettings.findUnique({ where: { id: "default" }, select: { currency: true } }),
  ]);
  if (!post) notFound();

  const currency = settings?.currency ?? "EGP";
  const formatPrice = (price: number) => `${currency} ${price.toFixed(2)}`;
  const generatedSummary = combineOrderSummaryItems(post.orders.flatMap((order) =>
    order.items.map((item) => ({
      itemName: item.itemName,
      quantity: item.quantity,
      unitPriceCents: Math.round(item.unitPrice.toNumber() * 100),
    })),
  ));
  const savedSummary = post.summaryItems === null ? null : orderSummaryItemsSchema.safeParse(post.summaryItems);
  if (savedSummary && !savedSummary.success) {
    console.error("Stored Open to eat summary is invalid", { sessionId });
  }
  const orderSummary = savedSummary?.success ? savedSummary.data : generatedSummary;
  const studentGroups = new Map<
    string,
    { user: (typeof post.orders)[number]["user"]; orders: (typeof post.orders)[number][] }
  >();
  for (const order of post.orders) {
    const studentOrders = studentGroups.get(order.user.id) ?? { user: order.user, orders: [] };
    studentOrders.orders.push(order);
    studentGroups.set(order.user.id, studentOrders);
  }
  const students = Array.from(studentGroups.values());
  const displayTitle = getOpenToEatPostTitle(post.menu.title);
  const description = post.menu.description?.trim();
  const hasUniqueDescription = description && description.toLowerCase() !== post.menu.title.trim().toLowerCase();

  return (
    <main className="min-h-screen bg-[#f5f6f7] text-[#202124]">
      <SiteHeader />
      <section className="mx-auto max-w-[1080px] px-4 pb-16 pt-10 sm:px-6 sm:pt-12">
        <a href="/admin/food" className="text-sm font-bold text-[#a32332] hover:underline">{t("← Back to Open to eat posts")}</a>

        <header className="mt-7 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#a32332]">{t("Open to eat post")} · {t(post.status.toLowerCase())}</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{displayTitle}</h1>
              {hasUniqueDescription && <p className="mt-2 text-slate-600">{description}</p>}
              {post.deadline && <p className="mt-3 text-sm text-slate-500">{t("Order deadline: {date}", { date: post.deadline.toLocaleString(dateLocale) })}</p>}
            </div>
            <div className="flex flex-col items-start gap-3 sm:items-end">
              <DeleteOpenToEatPostButton sessionId={post.id} title={displayTitle} />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3 text-sm">
            <span className="rounded-full bg-slate-100 px-3 py-1.5 font-semibold">{t(post.orders.length === 1 ? "{count} order" : "{count} orders", { count: post.orders.length })}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1.5 font-semibold">{t(students.length === 1 ? "{count} student" : "{count} students", { count: students.length })}</span>
          </div>
          {post.menu.imageUrl && <ZoomableImage src={post.menu.imageUrl} alt={`${displayTitle} menu`} />}
        </header>

        <OrderSummaryEditor
          sessionId={post.id}
          currency={currency}
          initialItems={orderSummary}
          initiallySaved={savedSummary?.success ?? false}
          initialNotes={post.summaryNotes}
        />

        <section className="mt-7">
          <h2 className="text-2xl font-bold">{t("Individual student orders")}</h2>
          {students.length > 0 ? (
            <div className="mt-4 space-y-4">
              {students.map((student) => {
                const studentTotal = student.orders.reduce(
                  (sum, order) => sum + order.items.reduce((orderTotal, item) => orderTotal + item.unitPrice.toNumber() * item.quantity, 0),
                  0,
                );
                const initials = student.user.fullName
                  .trim()
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((part) => part[0] ?? "")
                  .join("")
                  .toUpperCase();

                return (
                  <article key={student.user.id} className="bg-white p-5 shadow-sm sm:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                      <div className="flex min-w-0 items-center gap-3">
                        {student.user.profileImageUrl ? (
                          <img src={getCloudinaryImageUrl(student.user.profileImageUrl, 96, 96)} alt="" loading="lazy" decoding="async" className="h-12 w-12 shrink-0 rounded-full object-cover" />
                        ) : (
                          <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#f8e9eb] text-sm font-bold text-[#a32332]">
                            {initials || "?"}
                          </span>
                        )}
                        <div className="min-w-0">
                          <h3 className="truncate font-bold">{student.user.fullName}</h3>
                        </div>
                      </div>
                      <p className="text-sm font-bold">{t("Student total: {price}", { price: formatPrice(studentTotal) })}</p>
                    </div>

                    <div className="mt-4 space-y-3">
                      {student.orders.map((order) => {
                        const orderTotal = order.items.reduce(
                          (sum, item) => sum + item.unitPrice.toNumber() * item.quantity,
                          0,
                        );
                        return (
                          <section key={order.id} className="rounded-md border border-slate-200 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-bold">{t("Order submitted")}</p>
                              <p className="text-xs text-slate-500">{order.submittedAt?.toLocaleString(dateLocale)}</p>
                            </div>
                            <ul className="mt-3 divide-y divide-slate-100">
                              {order.items.map((item) => (
                                <li key={item.id} className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2 first:pt-0 last:pb-0 text-sm">
                                  <span>{item.itemName} × {item.quantity}</span>
                                  <span className="text-slate-600">
                                    {t("{price} each", { price: formatPrice(item.unitPrice.toNumber()) })} · {formatPrice(item.unitPrice.toNumber() * item.quantity)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                            <p className="mt-3 border-t border-slate-100 pt-3 text-right text-sm font-bold">{t("Order total: {price}", { price: formatPrice(orderTotal) })}</p>
                          </section>
                        );
                      })}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 bg-white p-6 text-sm text-slate-600 shadow-sm">{t("No students have ordered from this post yet.")}</div>
          )}
        </section>
      </section>
    </main>
  );
}
