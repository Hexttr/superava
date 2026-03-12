import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "superava",
  description: "Создание фото с персональным профилем лица.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-[radial-gradient(ellipse_at_top,rgba(147,51,234,0.15),transparent_50%),radial-gradient(circle_at_bottom_right,rgba(236,72,153,0.08),transparent_40%),#0f0a1a] antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
