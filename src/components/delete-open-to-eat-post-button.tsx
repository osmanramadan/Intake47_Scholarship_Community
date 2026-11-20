"use client";

import { fetchWithProgress as fetch } from "@/lib/request-progress";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/language-provider";

export function DeleteOpenToEatPostButton({
  sessionId,
  title,
}: {
  sessionId: string;
  title: string;
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function deletePost() {
    if (!window.confirm(t("Delete \"{title}\" and all student orders for this post? This cannot be undone.", { title }))) return;

    setDeleting(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/open-to-eat/${sessionId}`, { method: "DELETE" });
      const body = await response.json();
      if (body.deleted) {
        if (body.warning) window.alert(t(body.message));
        router.push("/admin/food");
        router.refresh();
        return;
      }
      if (!response.ok) throw new Error(t(body.error ?? "Unable to delete this post."));
      throw new Error(t("The server did not confirm that the post was deleted."));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? t(deleteError.message) : t("Unable to delete this post."));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={deletePost}
        disabled={deleting}
        className="cursor-pointer rounded-md border border-red-200 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {deleting ? t("Deleting post...") : t("Delete post")}
      </button>
      {error && <p role="alert" className="mt-2 max-w-xs text-sm text-red-700">{error}</p>}
    </div>
  );
}
