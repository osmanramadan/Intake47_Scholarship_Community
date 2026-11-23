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
  const pdfViewerUrl = current.id === "legacy-menu-image"
    ? null
    : `/api/menu-files/${encodeURIComponent(current.id)}`;

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
          <div>
            <div className="flex min-h-[260px] flex-col items-center justify-center gap-4 bg-slate-100 px-5 text-center sm:hidden">
              <div className="rounded-md border border-slate-200 bg-white px-5 py-4">
                <p className="max-w-[18rem] truncate font-bold">{current.fileName}</p>
                <p className="mt-2 text-sm text-slate-600">{t("Open the PDF with your phone's PDF viewer.")}</p>
              </div>
              <a
                href={pdfViewerUrl ?? `${current.url}#toolbar=1&navpanes=0`}
                target="_blank"
                rel="noreferrer"
                className="min-h-12 rounded-md bg-[#a32332] px-5 py-3 text-sm font-bold text-white"
              >
                {t("Open PDF")}
              </a>
            </div>
            <div className="hidden sm:block">
              <object
                data={pdfViewerUrl ?? `${current.url}#toolbar=1&navpanes=0`}
                type="application/pdf"
                aria-label={`${title} - ${current.fileName}`}
                className="h-[75vh] min-h-[480px] w-full border-0"
              >
                <div className="flex min-h-[480px] flex-col items-center justify-center gap-4 bg-slate-100 px-5 text-center">
                  <p className="font-bold">{t("PDF viewer is not available in this browser.")}</p>
                  <a
                    href={pdfViewerUrl ?? current.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md bg-[#a32332] px-5 py-3 text-sm font-bold text-white"
                  >
                    {t("Open PDF")}
                  </a>
                </div>
              </object>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3">
              <p className="max-w-xl truncate text-sm font-bold">{current.fileName}</p>
              <a href={current.url} target="_blank" rel="noreferrer" className="text-sm font-bold text-[#a32332] hover:underline">
                {t("Open PDF in new tab")}
              </a>
            </div>
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
