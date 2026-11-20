"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLanguage } from "@/components/language-provider";

type UserStatus = "ACTIVE" | "DISABLED" | "PENDING_VERIFICATION";

export function UserManagementActions({
  userId,
  fullName,
  status,
  isCurrentUser,
}: {
  userId: string;
  fullName: string;
  status: UserStatus;
  isCurrentUser: boolean;
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function updateStatus(action: "suspend" | "reactivate") {
    const text = action === "suspend"
      ? t("Suspend {name}'s account? They will lose access.", { name: fullName })
      : t("Reactivate {name}'s account?", { name: fullName });
    if (!window.confirm(text)) return;

    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(t(body.error ?? "Unable to update this user."));
      router.refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? t(actionError.message) : t("Unable to update this user."));
    } finally {
      setBusy(false);
    }
  }

  async function deleteUser() {
    if (!window.confirm(t("Permanently delete {name} and their account data? This cannot be undone.", { name: fullName }))) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, { method: "DELETE" });
      const body = await response.json();
      if (!response.ok) throw new Error(t(body.error ?? "Unable to delete this user."));
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? t(deleteError.message) : t("Unable to delete this user."));
    } finally {
      setBusy(false);
    }
  }

  if (isCurrentUser) return <p className="text-sm font-semibold text-slate-500">{t("Your account is protected")}</p>;

  return (
    <div className="flex flex-wrap items-center gap-3 lg:justify-end">
      {status === "DISABLED" ? (
        <button type="button" onClick={() => updateStatus("reactivate")} disabled={busy} className="cursor-pointer rounded-md border border-slate-300 px-4 py-2 text-sm font-bold hover:border-[#a32332] disabled:cursor-not-allowed disabled:opacity-60">
          {t("Reactivate")}
        </button>
      ) : (
        <button type="button" onClick={() => updateStatus("suspend")} disabled={busy} className="cursor-pointer rounded-md border border-amber-300 px-4 py-2 text-sm font-bold text-amber-800 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60">
          {t("Suspend")}
        </button>
      )}
      <button type="button" onClick={deleteUser} disabled={busy} className="cursor-pointer rounded-md border border-red-200 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60">
        {t("Delete")}
      </button>
      {error && <p role="alert" className="w-full text-sm text-red-700">{error}</p>}
    </div>
  );
}
