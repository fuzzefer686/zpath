import { SectionHeading } from "@/components/zpath/SectionHeading";
import { TierCard } from "@/components/zpath/TierBadge";

export function DemoResults() {
  return (
    <section className="py-20 sm:py-28">
      <div className="container-page">
        <SectionHeading
          eyebrow="Kết quả mẫu"
          title={
            <>
              3 mức tỉ lệ <span className="text-gradient-hero">trực quan</span>
            </>
          }
          description="Mỗi học sinh sẽ rơi vào 1 trong 3 nhóm. Biết mình đứng ở đâu để có chiến lược phù hợp."
        />
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          <TierCard tier="LOW" percent="< 40%" />
          <TierCard tier="MID" percent="40 - 70%" />
          <TierCard tier="HIGH" percent="> 70%" />
        </div>
      </div>
    </section>
  );
}
