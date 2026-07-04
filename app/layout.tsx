import type { Metadata } from "next";
import "katex/dist/katex.min.css";
import "./globals.css";
import { Navbar } from "@/components/zpath/Navbar";
import { Footer } from "@/components/zpath/Footer";
import { SideRailAds } from "@/components/zpath/SideRailAds";
import { HeroPopupAd } from "@/components/zpath/HeroPopupAd";
import { Score2026Popup } from "@/components/zpath/Score2026Popup";
import { Providers } from "@/components/zpath/Providers";
import { MetaPixelPageViewTracker } from "@/components/zpath/MetaPixel";
import { Analytics } from "@vercel/analytics/next";
import { getMetadataBase, SITE_NAME } from "@/lib/seo";
import { Suspense } from "react";
import Script from "next/script";
import { ADSENSE_CLIENT } from "@/config/ads";

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: {
    default: "ZPATH - Định hướng tương lai",
    template: `%s | ${SITE_NAME}`,
  },
  description: "Hiểu mình, hiểu ngành, chọn đúng tương lai",
  openGraph: {
    title: "ZPATH - Định hướng tương lai",
    description: "Hiểu mình, hiểu ngành, chọn đúng tương lai",
    siteName: SITE_NAME,
    locale: "vi_VN",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;

  return (
    <html lang="vi">
      <head>
        <Script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        {metaPixelId ? (
          <Script
            id="meta-pixel"
            strategy="beforeInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', ${JSON.stringify(metaPixelId)});
                fbq('track', 'PageView');
              `,
            }}
          />
        ) : null}
      </head>
      <body className="min-h-screen flex flex-col bg-background font-sans text-foreground">
        {metaPixelId ? (
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              src={`https://www.facebook.com/tr?id=${encodeURIComponent(metaPixelId)}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        ) : null}
        <Suspense fallback={null}>
          <MetaPixelPageViewTracker pixelId={metaPixelId} />
        </Suspense>
        <Providers>
          <Navbar />

          {/* Site-wide promo: fixed side-rails on wide screens + the dismissible
              popup on every tab (both self-exclude on auth/admin/low-content routes). */}
          <SideRailAds />
          <HeroPopupAd />
          <Score2026Popup />

          {/* Nội dung các trang sẽ hiển thị ở đây */}
          <main className="flex-1">
            {children}
          </main>

          <Footer />
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
