import type { Metadata } from "next";
import { Antic, Doto } from "next/font/google";
import "./globals.css";
import { LayoutShell } from "@/components/layout/LayoutShell";

const antic = Antic({
  weight: "400",
  variable: "--font-antic",
  subsets: ["latin"],
});

const doto = Doto({
  variable: "--font-doto",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JC — Portfolio",
  description: "Jotace's personal portfolio",
  alternates: {
    types: {
      "application/rss+xml": [
        { url: "/feed.xml", title: "Juance — Blog RSS" },
      ],
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${antic.variable} ${doto.variable} antialiased bg-white text-[#1A1A2E] font-(family-name:--font-antic)`}
      >
        <LayoutShell>
          {children}
        </LayoutShell>
      </body>
    </html>
  );
}
