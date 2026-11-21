import { redirect } from "next/navigation";
import { getCachedServerSession } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import { OpenToEatForm } from "@/components/open-to-eat-form";
import { getLocale } from "@/lib/locale";
import { translate } from "@/lib/i18n";

export const instant = false;

export default async function NewOpenToEatPage() {
  const session = await getCachedServerSession();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");
  const locale = await getLocale();
  const t = (message: string) => translate(locale, message);

  return (
    <main className="min-h-screen bg-[#f5f6f7] text-[#202124]">
      <SiteHeader />
      <section className="mx-auto max-w-[980px] px-4 pb-16 pt-10 sm:px-6 sm:pt-12">
        <a href="/admin/food" className="text-sm font-bold text-[#a32332] hover:underline">{t("← Back to food orders")}</a>
        <div className="mt-8">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#a32332]">{t("Open to eat 😊")}</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">{t("Create an Open to eat post.")}</h1>
          <p className="mt-3 text-lg text-slate-600">{t("Upload one menu image. Students will enter their chosen dishes, prices, and quantities from it.")}</p>
        </div>
        <div className="mt-9 bg-white p-5 shadow-sm sm:p-9">
          <OpenToEatForm />
        </div>
      </section>
    </main>
  );
}
