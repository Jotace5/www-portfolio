import type { Metadata } from "next";
import { Antic, Doto } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import DotWave from "@/components/layout/DotWave";

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
  title: "Juance — Portfolio",
  description: "Juance's personal portfolio",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${antic.variable} ${doto.variable} antialiased bg-white text-[#1A1A2E] font-[family-name:var(--font-antic)]`}
      >
        <div className="min-h-screen flex flex-col">
          <Header />
          <DotWave />
          <main className="flex-1 max-w-5xl mx-auto w-full px-6 md:px-12 py-12">
            {children}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
