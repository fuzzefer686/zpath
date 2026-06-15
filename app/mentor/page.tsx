import type { Metadata } from "next";
import Link from "next/link";

import { getAuthContext } from "@/lib/zpath-auth";
import { listUserConversations } from "@/lib/mentor/server";
import { Button } from "@/components/ui/button";
import { MentorWorkspace } from "./_components/MentorWorkspace";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tư vấn cùng Mentor ZPath",
  description: "Đặt câu hỏi và nhận tư vấn tuyển sinh, hướng nghiệp từ đội ngũ mentor ZPath.",
};

export default async function MentorPage() {
  const auth = await getAuthContext();

  if (!auth) {
    return (
      <div className="container-page flex min-h-[60vh] flex-col items-center justify-center text-center">
        <h1 className="text-3xl font-black tracking-tight">Tư vấn cùng Mentor ZPath</h1>
        <p className="mt-3 max-w-md text-sm text-muted-foreground">
          Đăng nhập để gửi câu hỏi và nhận tư vấn tuyển sinh, hướng nghiệp trực tiếp từ đội ngũ
          mentor.
        </p>
        <Button asChild variant="hero" className="mt-6">
          <Link href="/login?next=/mentor">Đăng nhập để được tư vấn</Link>
        </Button>
      </div>
    );
  }

  const conversations = await listUserConversations(auth.user.id);

  return (
    <div className="container-page py-6">
      <MentorWorkspace userId={auth.user.id} initialConversations={conversations} />
    </div>
  );
}
