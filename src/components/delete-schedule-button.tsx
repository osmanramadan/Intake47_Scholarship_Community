"use client";

import { fetchWithProgress as fetch } from "@/lib/request-progress";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLanguage } from "@/components/language-provider";

export function DeleteScheduleButton({ scheduleId, title }: { scheduleId: string; title: string }) {
  const { t } = useLanguage();
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function deleteSchedule() {
    if (!window.confirm(t("Delete \"{title}\"? The uploaded file will also be deleted. This cannot be undone.", { title }))) return;
    setDeleting(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/schedule/${encodeURIComponent(scheduleId)}`, { method: "DELETE" });
      const body = await response.json();
      if (!response.ok) throw new Error(t(body.error ?? "Unable to delete this weekly table."));
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? t(deleteError.message) : t("Unable to delete this weekly table."));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={deleteSchedule}
        disabled={deleting}
        className="cursor-pointer rounded-md border border-red-200 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {deleting ? t("Deleting...") : t("Delete weekly table")}
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
