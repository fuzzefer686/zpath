import type { Metadata } from "next";
import "katex/dist/katex.min.css";
import "./globals.css";
import { Navbar } from "@/components/zpath/Navbar";
import { Footer } from "@/components/zpath/Footer";
import { Providers } from "@/components/zpath/Providers";
import { Analytics } from "@vercel/analytics/next";
import { getMetadataBase, SITE_NAME } from "@/lib/seo";

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
  return (
    <html lang="vi">
      <body className="min-h-screen flex flex-col bg-background font-sans text-foreground">
        <Providers>
          <Navbar />
          
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
