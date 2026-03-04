import type { Metadata } from "next";
import { Antic, Doto } from "next/font/google";
import "./globals.css";

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
  title: "jotace",
  description: "self-made software engenieer ex-architec swiching carreer",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${antic.variable} ${doto.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}