import type { Metadata } from "next";
import localFont from "next/font/local";
import { GoogleTagManager } from "@next/third-parties/google";
import { AmplitudeAnalytics } from "@/components/amplitude-analytics";
import "@seed-design/css/all.css";
import "./globals.css";

const GTM_CONTAINER_ID = "GTM-P2HHB9CG";

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

const SITE_URL = "https://magisa.vercel.app";
const SITE_TITLE = "Magisa — 테크 블로그 아카이버";
const SITE_DESCRIPTION = "구독한 테크 블로그의 새 글을 모아 보는 아카이버";

// 홈 화면은 검색엔진에 노출돼도 괜찮다 — 관리자 전용 화면(/sources, /admin-login)은
// 각 페이지에서 robots: noindex로 따로 덮어쓴다 (docs/decisions.md 참고).
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: "Magisa",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  verification: {
    google: "lhOSAHwCAKIdiUFUj-lftkkbb8fIjsD21lB_uEAvuYg",
  },
  alternates: {
    types: { "application/rss+xml": `${SITE_URL}/feed.xml` },
  },
};

// 검색결과에 사이트명이 정확히 나오도록 하는 최소한의 구조화 데이터 (docs/growth-strategy.md 참고).
const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Magisa",
  url: SITE_URL,
  description: SITE_DESCRIPTION,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" data-seed-color-mode="light" className={freesentation.variable}>
      {process.env.NODE_ENV === "production" && <GoogleTagManager gtmId={GTM_CONTAINER_ID} />}
      {process.env.NODE_ENV === "production" && <AmplitudeAnalytics />}
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
        {process.env.NODE_ENV === "production" && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${GTM_CONTAINER_ID}`}
              height={0}
              width={0}
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        )}
        <div className="app-shell">{children}</div>
      </body>
    </html>
  );
}
