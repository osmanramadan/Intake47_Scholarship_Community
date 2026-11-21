"use client";

import { fetchWithProgress as fetch } from "@/lib/request-progress";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/language-provider";

export function OpenToEatForm() {
  const { t } = useLanguage();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setSaving(true);
    setMessage("");
    setError("");

    const formData = new FormData(formElement);

    try {
      const response = await fetch("/api/admin/open-to-eat", { method: "POST", body: formData });
      const body = await response.json();
      if (!response.ok) throw new Error(t(body.error ?? "Unable to publish this Open to eat post."));
      formElement.reset();
      setMessage(t(body.message));
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? t(submitError.message) : t("Unable to publish this Open to eat post."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-7">
      <label className="block text-sm font-bold">
        {t("Open to eat post title")}
        <input name="title" required minLength={2} maxLength={150} placeholder={t("For example: Friday lunch order")} className="mt-2 w-full rounded-md border border-slate-200 px-4 py-3 outline-none focus:border-[#a32332] focus:ring-4 focus:ring-[#a32332]/10" />
      </label>
      <label className="block text-sm font-bold">
        {t("Menu image")} <span className="font-normal text-slate-500">{t("(JPG/PNG/WebP; max 5 MB)")}</span>
        <input name="menuImage" type="file" accept="image/jpeg,image/png,image/webp" required className="mt-2 block w-full rounded-md border border-slate-200 px-4 py-3 text-sm" />
      </label>
      <label className="block text-sm font-bold">
        {t("Post details")} <span className="font-normal text-slate-500">{t("(optional)")}</span>
        <textarea name="description" rows={3} maxLength={1000} placeholder={t("Delivery notes, location, or other details.")} className="mt-2 w-full rounded-md border border-slate-200 px-4 py-3 outline-none focus:border-[#a32332] focus:ring-4 focus:ring-[#a32332]/10" />
      </label>
      <label className="block text-sm font-bold sm:max-w-sm">
        {t("Order deadline")} <span className="font-normal text-slate-500">{t("(optional)")}</span>
        <input name="deadline" type="datetime-local" className="mt-2 w-full rounded-md border border-slate-200 px-4 py-3 outline-none focus:border-[#a32332] focus:ring-4 focus:ring-[#a32332]/10" />
      </label>

      {message && <p className="rounded-md bg-green-50 px-4 py-3 text-sm font-medium text-green-700">{message}</p>}
      {error && <p role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}
      <button disabled={saving} className="cursor-pointer rounded-md bg-[#a32332] px-6 py-3 font-bold text-white hover:bg-[#871d2a] disabled:cursor-not-allowed disabled:opacity-60">
        {saving ? t("Publishing post...") : t("Publish Open to eat post")}
      </button>
    </form>
  );
}
