import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { GoogleTagManager } from "@next/third-parties/google";
import { AmplitudeAnalytics } from "@/components/amplitude-analytics";
import { DEFAULT_OG_IMAGE, SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from "./seo";
import "@seed-design/css/all.css";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const GTM_CONTAINER_ID = "GTM-P2HHB9CG";
const GOOGLE_SITE_VERIFICATION = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;
const ANALYTICS_ENABLED = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "true";

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
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
    keywords: ["테크 블로그", "기술 블로그", "테크 글", "개발 글", "AI 기술 글"],
  alternates: {
    canonical: "/",
    types: { "application/rss+xml": `${SITE_URL}/feed.xml` },
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: "ko_KR",
    type: "website",
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: SITE_NAME,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [{ url: DEFAULT_OG_IMAGE, alt: SITE_NAME }],
  },
  ...(GOOGLE_SITE_VERIFICATION ? { verification: { google: GOOGLE_SITE_VERIFICATION } } : {}),
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      inLanguage: "ko-KR",
    },
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: DEFAULT_OG_IMAGE,
    },
  ],
};

export default function RootLayout({
  children,
  modal,
}: Readonly<{
  children: React.ReactNode;
  modal: React.ReactNode;
}>) {
  return (
    <html lang="ko" data-seed-color-mode="light" className={freesentation.variable}>
      {ANALYTICS_ENABLED && <GoogleTagManager gtmId={GTM_CONTAINER_ID} />}
      {ANALYTICS_ENABLED && <AmplitudeAnalytics />}
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd).replace(/</g, "\\u003c") }}
        />
        {ANALYTICS_ENABLED && (
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
        {modal}
      </body>
    </html>
  );
}
