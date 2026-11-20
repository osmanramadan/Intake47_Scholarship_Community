import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/site-header";
import { BroadcastEmailForm } from "@/components/broadcast-email-form";
import { getLocale } from "@/lib/locale";
import { translate } from "@/lib/i18n";

export const instant = false;

export default async function AdminNotificationsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");
  const locale = await getLocale();
  const t = (message: string) => translate(locale, message);

  const recipientCount = await prisma.user.count();

  return (
    <main className="min-h-screen bg-[#f5f6f7] text-[#202124]">
      <SiteHeader />
      <section className="mx-auto max-w-[780px] px-4 pb-16 pt-10 sm:px-6 sm:pt-12">
        <Link href="/admin" className="text-sm font-bold text-[#a32332] hover:underline">{t("← Back to admin")}</Link>
        <div className="mt-8">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#a32332]">{t("Notifications")}</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">{t("Email all users.")}</h1>
          <p className="mt-3 text-lg text-slate-600">{t("Write an announcement that will be emailed to every registered account.")}</p>
        </div>
        <div className="mt-8 bg-white p-5 shadow-sm sm:p-8">
          <BroadcastEmailForm recipientCount={recipientCount} />
        </div>
      </section>
    </main>
  );
}
