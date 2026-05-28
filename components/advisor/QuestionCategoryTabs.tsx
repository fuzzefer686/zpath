import {
  BookOpenCheck,
  BriefcaseBusiness,
  CircleDollarSign,
  GraduationCap,
  Landmark,
  Layers3,
  Scale,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

const categoryIcons: Record<string, LucideIcon> = {
  "Review ngành": BookOpenCheck,
  "So sánh ngành": Layers3,
  "So sánh trường": Landmark,
  "Cơ hội đỗ": TrendingUp,
  "Tìm ngành phù hợp": GraduationCap,
  "Học phí & chương trình học": CircleDollarSign,
  "Nghề nghiệp sau tốt nghiệp": BriefcaseBusiness,
  "Thông tin tuyển sinh mới nhất": Scale,
};

type QuestionCategoryTabsProps = {
  categories: string[];
  activeCategory: string;
  onChange: (category: string) => void;
};

export function QuestionCategoryTabs({
  categories,
  activeCategory,
  onChange,
}: QuestionCategoryTabsProps) {
  return (
    <div>
      <h2 className="font-display text-2xl font-bold">Bạn muốn hỏi gì?</h2>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-2 lg:flex-wrap lg:overflow-visible">
        {categories.map((category) => {
          const Icon = categoryIcons[category] ?? BookOpenCheck;
          const isActive = category === activeCategory;

          return (
            <button
              key={category}
              type="button"
              onClick={() => onChange(category)}
              className={cn(
                "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold transition-colors",
                isActive
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-primary/5",
              )}
            >
              <Icon className="h-4 w-4" />
              {category}
            </button>
          );
        })}
      </div>
    </div>
  );
}
