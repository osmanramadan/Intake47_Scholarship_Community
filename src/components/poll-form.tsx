"use client";

import { fetchWithProgress as fetch } from "@/lib/request-progress";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/language-provider";

export function PollForm() {
  const { t } = useLanguage();
  const router = useRouter();
  const [options, setOptions] = useState(["", ""]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function updateOption(index: number, value: string) {
    setOptions((current) => current.map((option, optionIndex) => optionIndex === index ? value : option));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setSaving(true);
    setMessage("");
    setError("");
    const form = new FormData(formElement);
    form.set("options", JSON.stringify(options));

    try {
      const response = await fetch("/api/admin/polls", { method: "POST", body: form });
      const body = await response.json();
      if (!response.ok) throw new Error(t(body.error ?? "Unable to create the poll."));
      formElement.reset();
      setOptions(["", ""]);
      setMessage(t(body.message));
      router.refresh();
    } catch (pollError) {
      setError(pollError instanceof Error ? t(pollError.message) : t("Unable to create the poll."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-7">
      <label className="block text-sm font-bold">
        {t("Poll question")}
        <input name="title" required maxLength={200} placeholder={t("What should we choose this week?")} className="mt-2 w-full rounded-md border border-slate-200 px-4 py-3 font-medium outline-none focus:border-[#a32332] focus:ring-4 focus:ring-[#a32332]/10" />
      </label>
      <label className="block text-sm font-bold">
        {t("Description")} <span className="font-normal text-slate-500">{t("(optional)")}</span>
        <textarea name="description" maxLength={1000} rows={3} placeholder={t("Add context to help students decide.")} className="mt-2 w-full rounded-md border border-slate-200 px-4 py-3 font-medium outline-none focus:border-[#a32332] focus:ring-4 focus:ring-[#a32332]/10" />
      </label>
      <div>
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-bold">{t("Answer options")}</p>
          <button type="button" onClick={() => setOptions((current) => [...current, ""])} className="cursor-pointer text-sm font-bold text-[#a32332] hover:underline">{t("+ Add option")}</button>
        </div>
        <div className="mt-3 space-y-3">
          {options.map((option, index) => (
            <div key={index} className="flex gap-2">
              <input value={option} onChange={(event) => updateOption(index, event.target.value)} required maxLength={200} placeholder={t("Option {number}", { number: index + 1 })} className="w-full rounded-md border border-slate-200 px-4 py-3 outline-none focus:border-[#a32332] focus:ring-4 focus:ring-[#a32332]/10" />
              {options.length > 2 && <button type="button" onClick={() => setOptions((current) => current.filter((_, optionIndex) => optionIndex !== index))} className="cursor-pointer px-3 text-lg text-slate-500 hover:text-[#a32332]" aria-label={t("Remove option {number}", { number: index + 1 })}>×</button>}
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <label className="block text-sm font-bold">
          {t("Close date")} <span className="font-normal text-slate-500">{t("(optional)")}</span>
          <input name="deadline" type="datetime-local" className="mt-2 w-full rounded-md border border-slate-200 px-4 py-3 font-medium outline-none focus:border-[#a32332] focus:ring-4 focus:ring-[#a32332]/10" />
        </label>
        <label className="block text-sm font-bold">
          {t("Poll image")} <span className="font-normal text-slate-500">{t("(optional, max 5 MB)")}</span>
          <input name="image" type="file" accept="image/jpeg,image/png,image/webp" className="mt-2 block w-full rounded-md border border-slate-200 px-3 py-2 text-sm" />
        </label>
      </div>
      <label className="flex cursor-pointer items-center gap-3 text-sm font-bold">
        <input name="publish" type="checkbox" className="h-4 w-4 accent-[#a32332]" />
        {t("Publish immediately for students")}
      </label>
      {message && <p className="rounded-md bg-[#f8e9eb] px-4 py-3 text-sm font-medium text-[#a32332]">{message}</p>}
      {error && <p className="rounded-md bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}
      <button disabled={saving} className="cursor-pointer rounded-md bg-[#a32332] px-6 py-3 font-bold text-white hover:bg-[#871d2a] disabled:cursor-not-allowed disabled:opacity-60">
        {saving ? t("Creating poll...") : t("Create poll")}
      </button>
    </form>
  );
}
