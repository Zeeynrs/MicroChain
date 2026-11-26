import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/manrope";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import "./globals.css";
import { Toaster } from "@/components/toaster";

export const metadata: Metadata = {
  title: { default: "MicroChain", template: "%s | MicroChain" },
  description: "Petakan jaringan pemasok dan hitung rencana produksi ketika pasokan bahan baku terganggu.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="id" data-scroll-behavior="smooth">
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
