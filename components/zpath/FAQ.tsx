"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { SectionHeading } from "@/components/zpath/SectionHeading";

const faqs = [
  {
    q: "ZPATH có miễn phí không?",
    a: "Phiên bản dùng thử trên trang này hoàn toàn miễn phí. Phiên bản đầy đủ sẽ ra mắt sớm.",
  },
  {
    q: "Dữ liệu của tôi có được lưu lại không?",
    a: "Khi dùng thử, dữ liệu chỉ xử lý ngay trên trình duyệt và không gửi về máy chủ.",
  },
  {
    q: "Kết quả có chính xác tuyệt đối không?",
    a: "Đây là dự đoán dựa trên dữ liệu thống kê. Bạn nên dùng kết quả như một tham khảo bổ sung khi quyết định nguyện vọng.",
  },
  {
    q: "Tôi chưa biết SBTI của mình thì sao?",
    a: "Bạn có thể chọn Làm test nhanh, chỉ 4 câu hỏi để xác định nhóm tính cách.",
  },
  {
    q: "Có hỗ trợ tất cả các tỉnh không?",
    a: "Hiện đã hỗ trợ các tỉnh/thành lớn. Nếu chưa có, bạn có thể chọn Khác và phiên bản mở rộng sẽ cập nhật sớm.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="py-20 sm:py-28">
      <div className="container-page max-w-3xl">
        <SectionHeading
          eyebrow="FAQ"
          title={
            <>
              Câu hỏi <span className="text-gradient-hero">thường gặp</span>
            </>
          }
        />
        <div className="mt-12 space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = open === index;

            return (
              <div
                key={faq.q}
                className={cn(
                  "overflow-hidden rounded-2xl border-2 transition-all",
                  isOpen ? "border-primary bg-primary/5" : "border-border bg-card",
                )}
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : index)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="font-display font-bold">{faq.q}</span>
                  <ChevronDown className={cn("h-5 w-5 shrink-0 transition-transform", isOpen && "rotate-180 text-primary")} />
                </button>
                {isOpen && <div className="animate-fade-up px-5 pb-5 text-sm text-muted-foreground">{faq.a}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
