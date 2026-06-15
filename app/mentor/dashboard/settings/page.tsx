import { redirect } from "next/navigation";

import { getMentorContext } from "@/lib/auth/requireMentor";
import { MentorSettingsForm } from "./MentorSettingsForm";

export const dynamic = "force-dynamic";

export default async function MentorSettingsPage() {
  const mentor = await getMentorContext();
  if (!mentor) redirect("/");

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Cài đặt mentor</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Thông tin này hiển thị cho học sinh khi bạn trả lời ở chế độ danh tính thật.
        </p>
      </div>
      <MentorSettingsForm initialProfile={mentor.profile} />
    </div>
  );
}
