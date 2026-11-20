import type { Metadata } from "next";
import { Suspense } from "react";
import { LocaleBoundary } from "@/components/locale-boundary";
import "./globals.css";

export const metadata: Metadata = {
  title: "Scholarship Community",
  description: "Scholarship student community management platform",
  icons: {
    icon: "/scholarship-logo.jfif",
  },
};

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
