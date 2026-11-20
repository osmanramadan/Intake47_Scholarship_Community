"use client";

import { fetchWithProgress as fetch } from "@/lib/request-progress";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/language-provider";

export function ScheduleForm() {
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

    try {
      const response = await fetch("/api/admin/schedule", {
        method: "POST",
        body: new FormData(formElement),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(t(body.error ?? "Unable to publish the weekly schedule."));
      formElement.reset();
      setMessage(t(body.message));
      router.refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? t(uploadError.message) : t("Unable to publish the weekly schedule."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <label className="block text-sm font-bold">
        {t("Weekly Table title")}
        <input name="title" required minLength={2} maxLength={150} placeholder={t("Week 12 course table")} className="mt-2 w-full rounded-md border border-slate-200 px-4 py-3 font-medium outline-none focus:border-[#a32332] focus:ring-4 focus:ring-[#a32332]/10" />
      </label>
      <label className="block text-sm font-bold">
        {t("Description")} <span className="font-normal text-slate-500">{t("(optional)")}</span>
        <textarea name="description" rows={3} maxLength={1000} placeholder={t("Notes about this week's timetable.")} className="mt-2 w-full rounded-md border border-slate-200 px-4 py-3 font-medium outline-none focus:border-[#a32332] focus:ring-4 focus:ring-[#a32332]/10" />
      </label>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm font-bold">
          {t("Week starts")} <span className="font-normal text-slate-500">{t("(optional)")}</span>
          <input name="weekStart" type="date" className="mt-2 w-full rounded-md border border-slate-200 px-4 py-3 font-medium outline-none focus:border-[#a32332] focus:ring-4 focus:ring-[#a32332]/10" />
        </label>
        <label className="block text-sm font-bold">
          {t("Week ends")} <span className="font-normal text-slate-500">{t("(optional)")}</span>
          <input name="weekEnd" type="date" className="mt-2 w-full rounded-md border border-slate-200 px-4 py-3 font-medium outline-none focus:border-[#a32332] focus:ring-4 focus:ring-[#a32332]/10" />
        </label>
      </div>
      <label className="block text-sm font-bold">
        {t("Weekly timetable file")} <span className="font-normal text-slate-500">{t("(PDF, JPG, PNG, or WebP; max 10 MB)")}</span>
        <input name="file" type="file" required accept="application/pdf,image/jpeg,image/png,image/webp" className="mt-2 block w-full rounded-md border border-slate-200 px-3 py-2 text-sm" />
      </label>
      {message && <p className="rounded-md bg-[#f8e9eb] px-4 py-3 text-sm font-medium text-[#a32332]">{message}</p>}
      {error && <p role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}
      <button disabled={saving} className="cursor-pointer rounded-md bg-[#a32332] px-6 py-3 font-bold text-white hover:bg-[#871d2a] disabled:cursor-not-allowed disabled:opacity-60">
        {saving ? t("Publishing weekly table...") : t("Publish Weekly Table")}
      </button>
    </form>
  );
}
