import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/zpath/Navbar";
import { Footer } from "@/components/zpath/Footer";

export const metadata: Metadata = {
  title: "ZPATH - Định hướng tương lai",
  description: "Hiểu mình, hiểu ngành, chọn đúng tương lai",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="min-h-screen flex flex-col bg-background font-sans text-foreground">
        <Navbar />
        
        {/* Nội dung các trang sẽ hiển thị ở đây */}
        <main className="flex-1">
          {children}
        </main>

        <Footer />
      </body>
    </html>
  );
}
