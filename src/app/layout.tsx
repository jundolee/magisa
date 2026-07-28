import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@seed-design/css/all.css";
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
  title: "Magisa — 테크 블로그 아카이버",
  description: "구독한 테크 블로그의 새 글을 모아 보는 개인용 아카이버",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      data-seed-color-mode="light"
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
