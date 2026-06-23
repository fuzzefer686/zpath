"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ADMIN_TOOL_SECTIONS } from "@/lib/admin/sections";

export function AdminHubClient() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h2 className="text-2xl font-black tracking-tight">Tổng quan quản trị</h2>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Chọn công cụ bên dưới hoặc dùng menu trái để quản lý các tính năng của
          ZPATH. Danh sách sẽ mở rộng khi có thêm module admin mới.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {ADMIN_TOOL_SECTIONS.map((section) => {
          const Icon = section.icon;
          const isAvailable = section.status === "available";

          return (
            <Card
              key={section.id}
              className={isAvailable ? "shadow-sm" : "opacity-70 shadow-none"}
            >
              <CardHeader className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="rounded-lg bg-primary/10 p-2 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  {!isAvailable ? (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      Sắp ra mắt
                    </span>
                  ) : null}
                </div>
                <CardTitle className="text-lg">{section.title}</CardTitle>
                <CardDescription className="text-sm leading-6">
                  {section.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isAvailable ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={section.href}>
                      Mở công cụ
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Module này chưa được kích hoạt.
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-dashed bg-muted/20 shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Thêm công cụ admin mới
          </CardTitle>
          <CardDescription className="text-sm leading-6">
            Khi phát triển tính năng quản trị mới, thêm mục vào{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              lib/admin/sections.ts
            </code>{" "}
            và tạo trang tại{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              app/admin/&lt;ten-module&gt;/page.tsx
            </code>
            . Menu và trang tổng quan sẽ tự cập nhật.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
