"use client";

import { useState } from "react";
import { useLanguage } from "@/components/language-provider";
import { getCloudinaryImageUrl } from "@/lib/cloudinary-image";

export function ZoomableImage({ src, alt }: { src: string; alt: string }) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [zoom, setZoom] = useState(1);

  function close() {
    setIsOpen(false);
    setZoom(1);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={t("Open full-size image and zoom controls")}
        className="mt-6 block w-full cursor-zoom-in bg-slate-50 p-2"
      >
        <img
          src={getCloudinaryImageUrl(src, 1200)}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="mx-auto max-h-[28rem] w-full object-contain"
        />
        <span className="mt-2 block text-right text-xs font-semibold text-slate-500">{t("Click to zoom")}</span>
      </button>

      {isOpen && (
        <div
          role="presentation"
          onClick={close}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label={t("Image viewer")}
            onClick={(event) => event.stopPropagation()}
            className="flex max-h-[95vh] w-full max-w-[1400px] flex-col items-center gap-4"
          >
            <div className="flex max-w-full flex-wrap items-center justify-center gap-1 rounded-md bg-white p-2">
              <button type="button" onClick={() => setZoom((value) => Math.max(1, value - 0.25))} disabled={zoom <= 1} className="min-h-10 min-w-10 cursor-pointer rounded px-2 py-2 font-bold hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40" aria-label={t("Zoom out")}>−</button>
              <span className="min-w-14 text-center text-sm font-semibold">{Math.round(zoom * 100)}%</span>
              <button type="button" onClick={() => setZoom((value) => Math.min(3, value + 0.25))} disabled={zoom >= 3} className="min-h-10 min-w-10 cursor-pointer rounded px-2 py-2 font-bold hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40" aria-label={t("Zoom in")}>+</button>
              <button type="button" onClick={() => setZoom(1)} className="min-h-10 cursor-pointer whitespace-nowrap rounded px-2 py-2 text-sm font-semibold hover:bg-slate-100">{t("Reset")}</button>
              <button type="button" onClick={close} className="min-h-10 cursor-pointer whitespace-nowrap rounded px-2 py-2 text-sm font-bold text-[#a32332] hover:bg-slate-100">{t("Close")}</button>
            </div>
            <div className="flex max-h-[82vh] w-full items-center justify-center overflow-auto">
              <img
                src={src}
                alt={alt}
                decoding="async"
                style={{
                  maxHeight: `${82 / zoom}vh`,
                  maxWidth: `min(${92 / zoom}vw, 100%)`,
                  transform: `scale(${zoom})`,
                }}
                className="object-contain transition-transform duration-150"
              />
            </div>
          </section>
        </div>
      )}
    </>
  );
}
