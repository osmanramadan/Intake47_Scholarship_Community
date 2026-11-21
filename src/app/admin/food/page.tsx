import { redirect } from "next/navigation";
import Link from "next/link";
import { getCachedServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { orderSummaryItemsSchema } from "@/lib/order-summary";
import { SiteHeader } from "@/components/site-header";
import { DeleteOpenToEatPostButton } from "@/components/delete-open-to-eat-post-button";
import { getOpenToEatPostTitle } from "@/lib/open-to-eat";
import { getLocale } from "@/lib/locale";
import { translate } from "@/lib/i18n";
import { getCloudinaryImageUrl } from "@/lib/cloudinary-image";

export const instant = false;

export default async function AdminFoodPage() {
  const session = await getCachedServerSession();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");
  const locale = await getLocale();
  const t = (message: string, values?: Record<string, string | number>) => translate(locale, message, values);
  const dateLocale = locale === "ar" ? "ar-EG" : "en-US";

  const [posts, settings] = await Promise.all([
    prisma.orderingSession.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        menu: {
          select: {
            title: true,
            description: true,
            imageUrl: true,
            attachments: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true, fileType: true, fileName: true } },
          },
        },
        orders: {
          where: { status: "SUBMITTED" },
          select: { items: { select: { unitPrice: true, quantity: true } } },
        },
      },
    }),
    prisma.groupSettings.findUnique({ where: { id: "default" }, select: { currency: true } }),
  ]);
  const currency = settings?.currency ?? "EGP";
  const formatPrice = (price: number) => `${currency} ${price.toFixed(2)}`;
  const orderCount = posts.reduce((count, post) => count + post.orders.length, 0);

  return (
    <main className="min-h-screen bg-[#f5f6f7] text-[#202124]">
      <SiteHeader />
      <section className="mx-auto max-w-[1080px] px-4 pb-16 pt-10 sm:px-6 sm:pt-12">
        <Link href="/admin" className="text-sm font-bold text-[#a32332] hover:underline">{t("← Back to admin")}</Link>
        <div className="mt-8 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#a32332]">{t("Open to eat")}</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">{t("Open to eat posts.")}</h1>
            <p className="mt-3 text-lg text-slate-600">{t("Choose a post to see its students and orders.")}</p>
          </div>
          <Link href="/admin/food/new" className="rounded-md bg-[#a32332] px-5 py-3 text-sm font-bold text-white hover:bg-[#871d2a]">{t("+ Add Open to eat post")}</Link>
        </div>
        <p className="mt-6 text-sm font-semibold text-slate-600">{t(posts.length === 1 ? "{count} post" : "{count} posts", { count: posts.length })} · {t(orderCount === 1 ? "{count} submitted order" : "{count} submitted orders", { count: orderCount })}</p>

        {posts.length > 0 ? (
          <div className="mt-6 space-y-3">
            {posts.map((post) => {
              const savedSummary = post.summaryItems === null ? null : orderSummaryItemsSchema.safeParse(post.summaryItems);
              if (savedSummary && !savedSummary.success) {
                console.error("Stored Open to eat summary is invalid", { sessionId: post.id });
              }
              const postTotalCents = savedSummary?.success
                ? savedSummary.data.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0)
                : post.orders.reduce(
                  (sum, order) => sum + order.items.reduce(
                    (orderTotal, item) => orderTotal + Math.round(item.unitPrice.toNumber() * 100) * item.quantity,
                    0,
                  ),
                  0,
                );
              const postTotal = postTotalCents / 100;
              const displayTitle = getOpenToEatPostTitle(post.menu.title);
              const description = post.menu.description?.trim();
              const hasUniqueDescription = description && description.toLowerCase() !== post.menu.title.trim().toLowerCase();
              return (
                <article key={post.id} className="flex flex-col gap-4 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:p-5">
                  {(post.menu.attachments[0]?.fileType === "application/pdf") ? (
                    <div aria-hidden="true" className="flex h-24 w-full flex-col items-center justify-center rounded-md bg-[#f8e9eb] text-[#a32332] sm:w-32">
                      <span className="text-lg font-black">PDF</span>
                      <span className="mt-1 max-w-28 truncate text-xs font-semibold">{post.menu.attachments[0].fileName}</span>
                    </div>
                  ) : (post.menu.attachments[0]?.fileType.startsWith("image/") || post.menu.imageUrl) ? (
                    <img src={getCloudinaryImageUrl(post.menu.attachments[0]?.url ?? post.menu.imageUrl ?? "", 320)} alt="" loading="lazy" decoding="async" className="h-24 w-full rounded-md bg-slate-50 object-cover sm:w-32" />
                  ) : (
                    <div aria-hidden="true" className="flex h-24 w-full items-center justify-center rounded-md bg-slate-100 text-sm font-semibold text-slate-400 sm:w-32">
                      {t("No menu image")}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#a32332]">{t("Open to eat post")}</p>
                    <h2 className="mt-1 truncate text-lg font-bold">{displayTitle}</h2>
                    {hasUniqueDescription && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{description}</p>}
                    <p className="mt-2 text-sm text-slate-500">
                      {t(post.status.toLowerCase())} · {t("Opened {date}", { date: post.createdAt.toLocaleString(dateLocale, { timeZone: "Africa/Cairo" }) })} · {t(post.orders.length === 1 ? "{count} order" : "{count} orders", { count: post.orders.length })}
                      {post.deadline ? ` · ${t("Closes {date}", { date: post.deadline.toLocaleString(dateLocale, { timeZone: "Africa/Cairo" }) })}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 sm:flex-col sm:items-end sm:border-0 sm:pt-0">
                    <p className="text-sm font-bold text-[#a32332]">{t("Post total: {price}", { price: formatPrice(postTotal) })}</p>
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/food/${post.id}`} className="rounded-md border border-[#a32332] px-4 py-2 text-sm font-bold text-[#a32332] hover:bg-[#f8e9eb]">
                        {t("View orders")}
                      </Link>
                      <DeleteOpenToEatPostButton sessionId={post.id} title={displayTitle} />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-6 bg-white p-5 text-center shadow-sm sm:p-8">
            <p className="font-semibold">{t("No Open to eat posts yet.")}</p>
            <p className="mt-2 text-sm text-slate-600">{t("Create a post with a menu image to start receiving student orders.")}</p>
          </div>
        )}
      </section>
    </main>
  );
}
