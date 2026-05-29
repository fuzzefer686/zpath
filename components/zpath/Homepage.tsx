import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  Brain,
  BriefcaseBusiness,
  ClipboardCheck,
  Compass,
  GraduationCap,
  MapPinned,
  Target,
  UsersRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";

const concerns = [
  {
    icon: BookOpenCheck,
    title: "Quá nhiều ngành học",
    desc: "Học sinh phải chọn giữa hàng trăm ngành và hàng nghìn chương trình đào tạo khác nhau.",
  },
  {
    icon: MapPinned,
    title: "Thông tin thay đổi từng năm",
    desc: "Phương thức tuyển sinh, tổ hợp, điểm chuẩn và chỉ tiêu luôn cần được đối chiếu lại.",
  },
  {
    icon: Target,
    title: "Khó xác định ưu tiên",
    desc: "Nhiều gia đình phân vân giữa sở thích, năng lực, xu hướng xã hội và cơ hội việc làm.",
  },
];

const roadmap = [
  {
    icon: Brain,
    title: "Hiểu bản thân",
    desc: "Phân tích sở thích, năng lực, tính cách và ưu tiên học tập để nhận diện hướng đi phù hợp.",
  },
  {
    icon: GraduationCap,
    title: "Hiểu ngành học",
    desc: "Giúp học sinh nhìn rõ yêu cầu, nội dung đào tạo và các lựa chọn ngành gần nhau.",
  },
  {
    icon: BriefcaseBusiness,
    title: "Hiểu thị trường lao động",
    desc: "Kết nối lựa chọn đại học với bối cảnh nghề nghiệp, kỹ năng và cơ hội phát triển dài hạn.",
  },
  {
    icon: ClipboardCheck,
    title: "Xây kế hoạch xét tuyển",
    desc: "Hỗ trợ sắp xếp nguyện vọng, phương án học tập và chiến lược ứng tuyển thực tế hơn.",
  },
];

export function Homepage() {
  return (
    <main className="bg-background text-foreground">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-mesh" />
        <div className="absolute inset-0 grid-dots opacity-40" />

        <div className="container-page relative grid gap-10 pt-14 pb-16 sm:pt-20 sm:pb-24 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <div className="mb-6 inline-flex animate-fade-up items-center gap-2 rounded-full border-2 border-foreground/10 bg-card/85 px-4 py-2 text-xs font-bold uppercase tracking-widest backdrop-blur">
              <Compass className="h-3.5 w-3.5 text-accent" />
              Tư vấn tuyển sinh và hướng nghiệp
            </div>

            <h1
              className="animate-fade-up font-display text-4xl font-bold leading-[1.05] sm:text-5xl md:text-6xl"
              style={{ animationDelay: "90ms" }}
            >
              Đồng hành cùng học sinh Việt Nam trên hành trình{" "}
              <span className="text-gradient-hero">chọn đúng ngành, vào đúng trường</span>
            </h1>

            <p
              className="mt-6 max-w-2xl animate-fade-up text-base leading-8 text-muted-foreground sm:text-lg"
              style={{ animationDelay: "180ms" }}
            >
              Việc chọn ngành, chọn trường đại học không chỉ là một quyết định tuyển sinh,
              mà còn là bước ngoặt quan trọng ảnh hưởng đến tương lai nghề nghiệp của mỗi
              học sinh. ZPATH giúp học sinh và phụ huynh có một lộ trình rõ ràng, thực tế
              và phù hợp hơn.
            </p>

            <div
              className="mt-9 flex animate-fade-up flex-col gap-3 sm:flex-row"
              style={{ animationDelay: "270ms" }}
            >
              <Button asChild variant="hero" size="xl" className="w-full sm:w-auto">
                <Link href="/survey">
                  Bắt đầu định hướng <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="xl" className="w-full sm:w-auto">
                <Link href="/unimap">Khám phá trường</Link>
              </Button>
            </div>
          </div>

          <div className="relative">
            <div
              className="animate-fade-up rounded-2xl border-2 border-border bg-card p-5 shadow-md transition-transform duration-500 hover:-translate-y-1 sm:p-6 lg:animate-float-slow"
              style={{ animationDelay: "360ms" }}
            >
              <div className="flex items-center gap-4 border-b-2 border-border pb-5">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-2 border-border bg-background">
                  <Image
                    src="/zpath-logo.jpg"
                    alt="ZPATH"
                    fill
                    className="object-cover"
                    sizes="64px"
                    priority
                  />
                </div>
                <div>
                  <p className="text-sm font-bold uppercase tracking-widest text-primary">ZPATH</p>
                  <p className="mt-1 font-display text-xl font-bold">Hiểu mình - hiểu ngành - chọn đúng tương lai</p>
                </div>
              </div>

              <div className="mt-6 grid gap-4">
                {[
                  "Phân tích năng lực cá nhân",
                  "Định hướng ngành nghề",
                  "Tư vấn tuyển sinh theo dữ liệu",
                  "Kế hoạch học tập và xét tuyển",
                ].map((item, index) => (
                  <div
                    key={item}
                    className="flex items-center gap-4 rounded-xl bg-muted/55 p-4 transition-all duration-300 hover:translate-x-1 hover:bg-primary/10"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-primary text-sm font-bold text-primary-foreground">
                      {index + 1}
                    </span>
                    <span className="text-sm font-semibold sm:text-base">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24">
        <div className="container-page">
          <div className="mx-auto max-w-3xl animate-fade-up text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-primary">
              Vì sao cần một lộ trình rõ ràng?
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold leading-tight sm:text-5xl">
              Chọn đại học không nên là cuộc chạy đua mơ hồ theo điểm số hay xu hướng
            </h2>
            <p className="mt-5 text-base leading-8 text-muted-foreground sm:text-lg">
              Giữa quá nhiều nguồn thông tin tuyển sinh, học sinh và phụ huynh cần một cách
              nhìn có hệ thống để biết nên chọn ngành theo sở thích, theo năng lực, theo xu
              hướng hay theo cơ hội việc làm.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {concerns.map((item, index) => {
              const Icon = item.icon;

              return (
                <article
                  key={item.title}
                  className="group animate-fade-up rounded-2xl border-2 border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-md"
                  style={{ animationDelay: `${index * 110}ms` }}
                >
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-display text-xl font-bold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.desc}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-muted/40 py-16 sm:py-24">
        <div className="container-page">
          <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
            <div className="animate-fade-up">
              <p className="text-sm font-bold uppercase tracking-widest text-primary">
                ZPATH giải quyết như thế nào?
              </p>
              <h2 className="mt-3 font-display text-3xl font-bold leading-tight sm:text-5xl">
                Biến lựa chọn đại học thành một kế hoạch có chiến lược
              </h2>
              <p className="mt-5 text-base leading-8 text-muted-foreground sm:text-lg">
                Chúng tôi cung cấp các giải pháp tư vấn tuyển sinh, định hướng ngành nghề,
                phân tích năng lực cá nhân và hỗ trợ xây dựng kế hoạch học tập - xét tuyển.
                Mục tiêu là giúp mỗi học sinh hiểu bản thân, hiểu ngành học, hiểu thị trường
                lao động và đưa ra lựa chọn đại học một cách tự tin.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              {roadmap.map((item, index) => {
                const Icon = item.icon;

                return (
                  <article
                    key={item.title}
                    className="group animate-fade-up rounded-2xl border-2 border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-md"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground transition-transform duration-300 group-hover:rotate-3 group-hover:scale-110">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="font-display text-xl font-bold">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.desc}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24">
        <div className="container-page">
          <div className="relative animate-fade-up overflow-hidden rounded-2xl bg-gradient-hero px-6 py-12 text-center text-primary-foreground shadow-glow transition-transform duration-500 hover:-translate-y-1 sm:px-10 sm:py-16">
            <UsersRound className="mx-auto mb-5 h-11 w-11 animate-pulse-glow rounded-full opacity-90" />
            <h2 className="mx-auto max-w-3xl font-display text-3xl font-bold leading-tight sm:text-5xl">
              Tìm con đường phù hợp nhất với năng lực, đam mê và tương lai của bạn
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 opacity-90 sm:text-lg">
              Với ZPATH, hành trình vào đại học trở thành một kế hoạch có định hướng,
              có chiến lược và có sự đồng hành cùng chuyên gia.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild variant="lime" size="xl" className="w-full sm:w-auto">
                <Link href="/survey">Tư vấn ngành</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="xl"
                className="w-full border-white/40 bg-white/10 text-white hover:bg-white/20 sm:w-auto"
              >
                <Link href="/unimap">So sánh trường</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
