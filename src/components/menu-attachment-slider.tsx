"use client";

import { useState } from "react";
import { useLanguage } from "@/components/language-provider";
import { getCloudinaryImageUrl } from "@/lib/cloudinary-image";

export type MenuAttachment = {
  id: string;
  url: string;
  resourceType: string;
  fileName: string;
  fileType: string;
};

export function MenuAttachmentSlider({
  title,
  attachments,
}: {
  title: string;
  attachments: MenuAttachment[];
}) {
  const { t } = useLanguage();
  const [index, setIndex] = useState(0);
  if (attachments.length === 0) return null;

  const current = attachments[index];
  const isPdf = current.fileType === "application/pdf";

  function previous() {
    setIndex((currentIndex) => (currentIndex - 1 + attachments.length) % attachments.length);
  }

  function next() {
    setIndex((currentIndex) => (currentIndex + 1) % attachments.length);
  }

  return (
    <section className="mt-6" aria-label={t("Menu files")}>
      <div className="overflow-hidden border border-slate-200 bg-slate-50">
        {isPdf ? (
          <div className="flex min-h-72 flex-col items-center justify-center gap-4 p-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f8e9eb] text-2xl font-black text-[#a32332]">PDF</div>
            <p className="max-w-lg break-words font-bold">{current.fileName}</p>
            <a href={current.url} target="_blank" rel="noreferrer" className="rounded-md bg-[#a32332] px-5 py-3 text-sm font-bold text-white hover:bg-[#871d2a]">
              {t("Open PDF")}
            </a>
          </div>
        ) : (
          <img
            src={getCloudinaryImageUrl(current.url, 1200)}
            alt={`${title} menu - ${current.fileName}`}
            decoding="async"
            className="mx-auto max-h-[32rem] w-full object-contain"
          />
        )}
      </div>
      {attachments.length > 1 && (
        <div className="mt-3 flex items-center justify-between gap-3">
          <button type="button" onClick={previous} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50" aria-label={t("Previous menu file")}>←</button>
          <p className="text-sm font-semibold text-slate-500">{index + 1} / {attachments.length}</p>
          <button type="button" onClick={next} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50" aria-label={t("Next menu file")}>→</button>
        </div>
      )}
    </section>
  );
}
