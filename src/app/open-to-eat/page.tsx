import { redirect } from "next/navigation";
import { getCachedServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/site-header";
import { MenuOrderCard } from "@/components/menu-order-card";
import { getOpenToEatPostTitle } from "@/lib/open-to-eat";
import { getLocale } from "@/lib/locale";
import { translate } from "@/lib/i18n";

export const instant = false;

export default async function OpenToEatPage() {
  const session = await getCachedServerSession();
  if (!session) redirect("/login");
  const locale = await getLocale();
  const t = (message: string) => translate(locale, message);

  const [sessions, settings] = await Promise.all([
    prisma.orderingSession.findMany({
      where: {
        status: "OPEN",
        OR: [{ deadline: null }, { deadline: { gt: new Date() } }],
        menu: { isActive: true, imageUrl: { not: null } },
      },
      orderBy: { createdAt: "desc" },
      include: {
        menu: {
          select: { title: true, description: true, imageUrl: true },
        },
        orders: {
          where: { userId: session.user.id, status: "SUBMITTED" },
          orderBy: { submittedAt: "desc" },
          include: { items: true },
        },
      },
    }),
    prisma.groupSettings.findUnique({ where: { id: "default" }, select: { currency: true } }),
  ]);
  const currency = settings?.currency ?? "EGP";

  return (
    <main className="min-h-screen bg-[#f5f6f7] text-[#202124]">
      <SiteHeader />
      <section className="mx-auto max-w-[1080px] px-4 pb-16 pt-10 sm:px-6 sm:pt-12">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#a32332]">{t("Open to eat 😊")}</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">{t("Choose from the menu image.")}</h1>
        <p className="mt-3 max-w-2xl text-lg text-slate-600">{t("Open a post, enter the dishes, prices, and quantities you want, and submit your order for that post.")}</p>

        {sessions.length > 0 ? (
          <div className="mt-9 space-y-6">
            {sessions.map((orderingSession) => {
              const menuImageUrl = orderingSession.menu.imageUrl;
              if (!menuImageUrl) return null;
              return (
                <MenuOrderCard
                  key={orderingSession.id}
                  sessionId={orderingSession.id}
                  title={getOpenToEatPostTitle(orderingSession.menu.title)}
                  description={orderingSession.menu.description}
                  menuImageUrl={menuImageUrl}
                  deadline={orderingSession.deadline?.toISOString() ?? null}
                  currency={currency}
                  initialOrders={orderingSession.orders.map((order) => ({
                    id: order.id,
                    submittedAt: order.submittedAt?.toISOString() ?? "",
                    items: order.items.map((item) => ({
                      itemName: item.itemName,
                      quantity: item.quantity,
                      unitPrice: item.unitPrice.toString(),
                    })),
                  }))}
                />
              );
            })}
          </div>
        ) : (
          <div className="mt-9 bg-white p-6 text-center shadow-sm sm:p-10">
            <h2 className="text-2xl font-bold">{t("No Open to eat posts right now")}</h2>
            <p className="mt-3 text-slate-600">{t("When an administrator creates an Open to eat post, it will appear here.")}</p>
          </div>
        )}
      </section>
    </main>
  );
}
