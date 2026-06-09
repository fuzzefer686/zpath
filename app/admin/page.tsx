import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const cards = [
  {
    title: "News moderation",
    description: "Xem bài viết, trạng thái publish/draft và chuẩn bị duyệt nội dung.",
    href: "/admin/news",
  },
  {
    title: "Profiles",
    description: "Theo dõi hồ sơ public/profile của người dùng.",
    href: "/admin/profiles",
  },
  {
    title: "Users",
    description: "Theo dõi tài khoản, role và thông tin liên hệ.",
    href: "/admin/users",
  },
];

export default function AdminOverviewPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-black tracking-tight">Admin overview</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Skeleton admin panel cho News, Profiles và Users.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.href} href={card.href}>
            <Card className="h-full transition hover:-translate-y-0.5 hover:border-primary/40">
              <CardHeader>
                <CardTitle className="text-lg">{card.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-6 text-muted-foreground">
                {card.description}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
