"use client";

import { signOut } from "next-auth/react";
import { useLanguage } from "@/components/language-provider";
import { withRequestProgress } from "@/lib/request-progress";

export function LogoutButton({ className = "" }: { className?: string }) {
  const { t } = useLanguage();

  return (
    <button
      type="button"
      onClick={() => withRequestProgress(() => signOut({ callbackUrl: "/login" }))}
      className={`cursor-pointer text-sm font-bold text-slate-600 hover:text-[#a32332] ${className}`}
    >
      {t("Log out")}
    </button>
  );
}
