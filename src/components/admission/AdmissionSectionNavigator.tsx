import {
  BarChart3,
  Calculator,
  Grid3X3,
  Info,
  LayoutDashboard,
  ListChecks,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

export type AdmissionSectionNavItem = {
  href: string;
  label: string;
  Icon: LucideIcon;
};

const DEFAULT_NAV_ITEMS: AdmissionSectionNavItem[] = [
  { href: "#overview", label: "Tổng quan", Icon: LayoutDashboard },
  { href: "#admission-info", label: "Thông tin tuyển sinh", Icon: Info },
  { href: "#programs", label: "Chương trình tuyển sinh", Icon: ListChecks },
  { href: "#combinations", label: "Tổ hợp xét tuyển", Icon: Grid3X3 },
  { href: "#benchmarks", label: "Điểm chuẩn tham khảo", Icon: BarChart3 },
  { href: "#tuition", label: "Học phí", Icon: WalletCards },
  { href: "#calculator", label: "Tính cơ hội", Icon: Calculator },
];

export const PRO_MAX_NAV_ITEMS: AdmissionSectionNavItem[] = [
  { href: "#calculator", label: "Công cụ tính điểm", Icon: Calculator },
  { href: "#overview", label: "Tổng quan", Icon: LayoutDashboard },
  { href: "#admission-info", label: "Thông tin tuyển sinh", Icon: Info },
  { href: "#programs", label: "Chương trình tuyển sinh", Icon: ListChecks },
  { href: "#combinations", label: "Tổ hợp xét tuyển", Icon: Grid3X3 },
  { href: "#benchmarks", label: "Điểm chuẩn tham khảo", Icon: BarChart3 },
  { href: "#tuition", label: "Học phí", Icon: WalletCards },
];

type AdmissionSectionNavigatorProps = {
  items?: AdmissionSectionNavItem[];
};

export function AdmissionSectionNavigator({
  items = DEFAULT_NAV_ITEMS,
}: AdmissionSectionNavigatorProps) {
  return (
    <nav
      aria-label="Điều hướng nội dung tuyển sinh"
      className="sticky top-4 rounded-lg border border-border bg-card p-2 shadow-sm lg:top-6"
    >
      <div className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
        {items.map(({ href, label, Icon }) => (
          <a
            key={href}
            href={href}
            className="flex min-h-10 shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span className="whitespace-nowrap">{label}</span>
          </a>
        ))}
      </div>
    </nav>
  );
}
