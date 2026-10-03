import type { Metadata } from "next";
import Script from "next/script";
import { siteDescription, siteName, siteTitle, siteUrl, websiteSchema } from "@/lib/site-config";
import { yandexMetrikaId, yandexMetrikaScript } from "@/lib/yandex-metrika";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: siteTitle,
  description: siteDescription,
  applicationName: siteName,
  authors: [{ name: "Сора" }, { name: "Студия Велром", url: "https://RumIsCola.ru/" }],
  publisher: "Студия Велром",
  alternates: { canonical: siteUrl },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: siteUrl,
    siteName,
    title: siteTitle,
    description: siteDescription,
  },
  twitter: {
    card: "summary",
    title: siteTitle,
    description: siteDescription,
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <head>
        <link rel="preload" href="/fonts/caveat-bold.ttf" as="font" type="font/ttf" crossOrigin="anonymous" />
      </head>
      <body className="antialiased">
        {children}
        <script
          id="myaka-website-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema).replace(/</g, "\\u003c") }}
        />
        <Script id="yandex-metrika" strategy="afterInteractive">{yandexMetrikaScript}</Script>
        <noscript>
          <style>{".reveal { opacity: 1 !important; translate: none !important; }"}</style>
          <div>
            <img
              src={`https://mc.yandex.ru/watch/${yandexMetrikaId}`}
              style={{ position: "absolute", left: "-9999px" }}
              width="1"
              height="1"
              alt=""
            />
          </div>
        </noscript>
      </body>
    </html>
  );
}
