import { redirect } from "next/navigation";
import { getCachedServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/site-header";
import { UserManagementActions } from "@/components/user-management-actions";
import { getLocale } from "@/lib/locale";
import { translate } from "@/lib/i18n";
import { getCloudinaryImageUrl } from "@/lib/cloudinary-image";

export const instant = false;

export default async function AdminUsersPage() {
  const session = await getCachedServerSession();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");
  const locale = await getLocale();
  const t = (message: string, values?: Record<string, string | number>) => translate(locale, message, values);
  const dateLocale = locale === "ar" ? "ar-EG" : "en-US";

  const users = await prisma.user.findMany({
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      status: true,
      profileImageUrl: true,
      createdAt: true,
    },
  });

  return (
    <main className="min-h-screen bg-[#f5f6f7] text-[#202124]">
      <SiteHeader />
      <section className="mx-auto max-w-[1180px] px-4 pb-16 pt-10 sm:px-6 sm:pt-12">
        <a href="/admin" className="text-sm font-bold text-[#a32332] hover:underline">{t("← Back to admin")}</a>
        <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#a32332]">{t("Account administration")}</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">{t("All system users")}</h1>
            <p className="mt-3 text-lg text-slate-600">{t("Suspend access, reactivate accounts, or permanently delete a user.")}</p>
          </div>
          <p className="text-sm font-bold text-slate-500">{t(users.length === 1 ? "{count} user" : "{count} users", { count: users.length })}</p>
        </div>

        <div className="mt-8 space-y-3">
          {users.map((user) => (
            <article key={user.id} className="flex flex-col justify-between gap-5 bg-white p-5 shadow-sm lg:flex-row lg:items-center">
              <div className="flex min-w-0 items-center gap-4">
                {user.profileImageUrl ? (
                  <img src={getCloudinaryImageUrl(user.profileImageUrl, 112, 112)} alt={`${user.fullName} profile`} loading="lazy" decoding="async" className="h-14 w-14 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#f8e9eb] text-lg font-bold text-[#a32332]">
                    {user.fullName.charAt(0).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0">
                  <h2 className="truncate font-bold">{user.fullName}{user.id === session.user.id && <span className="ml-2 text-xs font-semibold text-slate-500">{t("(You)")}</span>}</h2>
                  <p className="truncate text-sm text-slate-600">{user.email}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {t(user.role.toLowerCase())} · {t(user.status.toLowerCase().replaceAll("_", " "))} · {t("joined {date}", { date: user.createdAt.toLocaleDateString(dateLocale) })}
                  </p>
                </div>
              </div>
              <UserManagementActions
                userId={user.id}
                fullName={user.fullName}
                status={user.status}
                isCurrentUser={user.id === session.user.id}
              />
            </article>
          ))}
          {users.length === 0 && <p className="bg-white p-8 text-center text-slate-600">{t("No users found.")}</p>}
        </div>
      </section>
    </main>
  );
}
