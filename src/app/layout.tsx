import type { Metadata } from "next";
import { Suspense } from "react";
import { LocaleBoundary } from "@/components/locale-boundary";
import { getLocale } from "@/lib/locale";
import { translate } from "@/lib/i18n";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: translate(locale, "Scholarship Community"),
    description: "Scholarship student community management platform",
    icons: {
      icon: "/scholarship-logo.jpg",
    },
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      dir="ltr"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        <Suspense fallback={null}>
          <LocaleBoundary>{children}</LocaleBoundary>
        </Suspense>
      </body>
    </html>
  );
}
