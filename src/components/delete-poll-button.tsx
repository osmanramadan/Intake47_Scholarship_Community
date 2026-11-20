"use client";

import { fetchWithProgress as fetch } from "@/lib/request-progress";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLanguage } from "@/components/language-provider";

export function DeletePollButton({ pollId, title }: { pollId: string; title: string }) {
  const { t } = useLanguage();
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function deletePoll() {
    if (!window.confirm(t("Delete \"{title}\" and all its votes? This cannot be undone.", { title }))) return;
    setDeleting(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/polls/${encodeURIComponent(pollId)}`, { method: "DELETE" });
      const body = await response.json();
      if (!response.ok) throw new Error(t(body.error ?? "Unable to delete this poll."));
      if (body.warning) window.alert(t(body.warning));
      router.push("/admin/polls");
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? t(deleteError.message) : t("Unable to delete this poll."));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={deletePoll}
        disabled={deleting}
        className="cursor-pointer rounded-md border border-red-200 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {deleting ? t("Deleting...") : t("Delete poll")}
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
