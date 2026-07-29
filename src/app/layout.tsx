import type { Metadata } from "next";
import localFont from "next/font/local";
import "@seed-design/css/all.css";
import "./globals.css";

const freesentation = localFont({
  variable: "--font-freesentation",
  display: "swap",
  src: [
    { path: "./fonts/freesentation/Freesentation-4Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/freesentation/Freesentation-5Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/freesentation/Freesentation-6SemiBold.woff2", weight: "600", style: "normal" },
    { path: "./fonts/freesentation/Freesentation-7Bold.woff2", weight: "700", style: "normal" },
  ],
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
    <html lang="ko" data-seed-color-mode="light" className={freesentation.variable}>
      <body>
        <div className="app-shell">{children}</div>
      </body>
    </html>
  );
}
