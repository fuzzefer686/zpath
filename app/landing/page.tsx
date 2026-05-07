import { CtaBanner } from "@/components/zpath/CtaBanner";
import { DemoResults } from "@/components/zpath/DemoResults";
import { FAQ } from "@/components/zpath/FAQ";
import { Features } from "@/components/zpath/Features";
import { Hero } from "@/components/zpath/Hero";
import { HowItWorks } from "@/components/zpath/HowItWorks";
import { SectionHeading } from "@/components/zpath/SectionHeading";
import { Testimonials } from "@/components/zpath/Testimonials";
import { TrialForm } from "@/components/zpath/TrialForm";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main>
        <Hero />
        <HowItWorks />
        <Features />
        <DemoResults />

        <section id="try" className="bg-muted/40 py-20 sm:py-28">
          <div className="container-page">
            <SectionHeading
              eyebrow="Dùng thử miễn phí"
              title={
                <>
                  Tính ngay <span className="text-gradient-hero">tỉ lệ đỗ</span> của bạn
                </>
              }
              description="Điền thông tin bên dưới. Kết quả hiện ra ngay lập tức, chưa cần đăng ký."
            />
            <div className="mt-14">
              <TrialForm />
            </div>
          </div>
        </section>

        <Testimonials />
        <FAQ />
        <CtaBanner />
      </main>
    </div>
  );
}
