import Link from "next/link";
import type { SVGProps } from "react";
import { Mail } from "lucide-react";
import { Logo } from "./Logo";

const Instagram = (props: SVGProps<SVGSVGElement>) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" /></svg>;
const Facebook = (props: SVGProps<SVGSVGElement>) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>;
const Youtube = (props: SVGProps<SVGSVGElement>) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z" /><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" /></svg>;
export function Footer() {
  return (
    <footer className="relative border-t border-border bg-foreground text-background">
      <div className="container-page py-14">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link href="/">
              <Logo size="md" showText={true} className="brightness-0 invert" />
            </Link>
            <p className="mt-4 max-w-sm text-sm text-background/60">
              Hướng nghiệp thông minh dành cho học sinh THPT — dự đoán tỉ lệ đỗ và tìm con đường phù hợp với bạn.
            </p>
            <div className="mt-6 flex gap-3">
              {[Instagram, Facebook, Youtube, Mail].map((Icon, i) => (
                <a key={i} href="#" className="flex h-10 w-10 items-center justify-center rounded-full border border-background/20 transition-colors hover:bg-primary hover:border-primary">
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
          <div>
            <div className="font-bold">Sản phẩm</div>
            <ul className="mt-4 space-y-3 text-sm text-background/60">
              <li><Link href="/advisor" className="hover:text-background">Tư vấn ngành</Link></li>
              <li><Link href="/profile" className="hover:text-background">Hồ sơ cá nhân</Link></li>
            </ul>
          </div>
          <div>
            <div className="font-bold">Hỗ trợ</div>
            <ul className="mt-4 space-y-3 text-sm text-background/60">
              <li><Link href="/landing#faq" className="hover:text-background">Câu hỏi thường gặp</Link></li>
              <li><Link href="#" className="hover:text-background">Liên hệ</Link></li>
              <li><Link href="#" className="hover:text-background">Điều khoản</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 border-t border-background/10 pt-6 text-center text-xs text-background/40">
          © {new Date().getFullYear()} ZPATH. Mở đường cho thế hệ Gen-Z.
        </div>
      </div>
    </footer>
  );
}
