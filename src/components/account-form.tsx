"use client";

import { fetchWithProgress as fetch } from "@/lib/request-progress";
import { ChangeEvent, FormEvent, useState } from "react";
import { useLanguage } from "@/components/language-provider";
import { getCloudinaryImageUrl } from "@/lib/cloudinary-image";

type AccountUser = {
  fullName: string;
  email: string;
  profileImageUrl: string | null;
};

export function AccountForm({ initialUser }: { initialUser: AccountUser }) {
  const { t } = useLanguage();
  const [user, setUser] = useState(initialUser);
  const [fullName, setFullName] = useState(initialUser.fullName);
  const [preview, setPreview] = useState(initialUser.profileImageUrl);
  const [selectedFile, setSelectedFile] = useState<File>();
  const [removeImage, setRemoveImage] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function chooseImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setRemoveImage(false);
    setPreview(URL.createObjectURL(file));
    setError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatus("");
    setError("");

    const formData = new FormData();
    formData.set("fullName", fullName);
    formData.set("removeImage", String(removeImage));
    if (selectedFile) formData.set("profileImage", selectedFile);

    try {
      const response = await fetch("/api/account", { method: "PUT", body: formData });
      const body = await response.json();
      if (!response.ok) throw new Error(t(body.error ?? "Unable to update your profile."));
      setUser(body.user);
      setFullName(body.user.fullName);
      setPreview(body.user.profileImageUrl);
      setSelectedFile(undefined);
      setRemoveImage(false);
      setStatus(t("Profile updated successfully."));
    } catch (updateError) {
      setError(updateError instanceof Error ? t(updateError.message) : t("Unable to update your profile."));
    } finally {
      setSaving(false);
    }
  }

  function clearImage() {
    setSelectedFile(undefined);
    setPreview(null);
    setRemoveImage(true);
  }

  return (
    <form onSubmit={submit} className="space-y-8">
      <div className="flex flex-col gap-6 border-b border-slate-200 pb-8 sm:flex-row sm:items-center">
        <div className="relative">
          {preview ? (
            <img
              src={getCloudinaryImageUrl(preview, 224, 224)}
              alt={t("{name} profile", { name: user.fullName })}
              decoding="async"
              className="h-28 w-28 rounded-3xl object-cover ring-4 ring-[#f8e9eb]"
            />
          ) : (
            <div className="flex h-28 w-28 items-center justify-center rounded-3xl bg-[#f8e9eb] text-4xl font-black text-[#a32332] ring-4 ring-[#f8e9eb]">
              {fullName.charAt(0).toUpperCase()}
            </div>
          )}
          <label className="absolute -bottom-2 -right-2 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-[#202124] text-lg text-white shadow-lg transition hover:bg-[#a32332]" title={t("Change profile image")}>
            <span aria-hidden="true">+</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseImage} className="sr-only" />
          </label>
        </div>
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#a32332]">{t("Profile photo")}</p>
          <h2 className="mt-1 text-xl font-black">{t("Make your profile yours")}</h2>
          <p className="mt-2 text-sm text-slate-500">{t("JPG, PNG, or WebP. Maximum size 5 MB.")}</p>
          {preview && <button type="button" onClick={clearImage} className="mt-3 text-sm font-semibold text-[#a32332] hover:underline">{t("Remove photo")}</button>}
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <label className="block text-sm font-bold">
          {t("Full name")}
          <input value={fullName} onChange={(event) => setFullName(event.target.value)} required minLength={2} maxLength={100} className="mt-2 w-full rounded-md border border-slate-200 px-4 py-3 font-medium outline-none transition focus:border-[#a32332] focus:ring-4 focus:ring-[#a32332]/10" />
        </label>
        <div className="text-sm">
          <span className="font-bold">{t("Email address")}</span>
          <p className="mt-2 rounded-2xl bg-slate-50 px-4 py-3 font-medium text-slate-500">{user.email}</p>
          <p className="mt-2 text-xs text-slate-400">{t("Email changes require verification.")}</p>
        </div>
      </div>

      {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}
      {status && <p className="rounded-md bg-[#f8e9eb] px-4 py-3 text-sm font-medium text-[#a32332]">{status}</p>}
      <div className="flex justify-end">
        <button disabled={saving} className="rounded-md bg-[#a32332] px-6 py-3 font-bold text-white shadow-lg shadow-[#a32332]/20 transition hover:bg-[#891f2b] disabled:cursor-not-allowed disabled:opacity-60">
          {saving ? t("Saving changes...") : t("Save changes")}
        </button>
      </div>
    </form>
  );
}
