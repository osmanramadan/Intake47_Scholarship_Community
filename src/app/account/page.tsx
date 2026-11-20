import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { AccountForm } from "@/components/account-form";
import { LogoutButton } from "@/components/logout-button";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/site-header";
import { getLocale } from "@/lib/locale";
import { translate } from "@/lib/i18n";

export const instant = false;

export default async function AccountPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const locale = await getLocale();
  const t = (message: string) => translate(locale, message);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { fullName: true, email: true, profileImageUrl: true },
  });
  if (!user) redirect("/login");

  return (
    <main className="min-h-screen bg-[#f5f6f7] text-[#202124]">
      <SiteHeader />
      <section className="mx-auto max-w-[980px] px-4 py-10 sm:px-6 sm:py-12">
        <div className="bg-white p-5 shadow-sm sm:p-10">
          <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">{t("My account")}</p>
              <h1 className="mt-2 text-4xl font-black tracking-tight">{t("Your profile")}</h1>
              <p className="mt-3 text-slate-500">{t("Update how your name and photo appear across the community.")}</p>
            </div>
            <LogoutButton className="w-fit rounded-md border border-slate-300 px-4 py-2 hover:border-[#a32332]" />
          </div>
          <AccountForm initialUser={user} />
        </div>
      </section>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-[1180px] px-4 py-6 text-sm text-slate-500 sm:px-6">{t("Scholarship Community · Your account")}</div>
      </footer>
    </main>
  );
}
