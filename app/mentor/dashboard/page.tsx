import { redirect } from "next/navigation";

import { getMentorContext } from "@/lib/auth/requireMentor";
import { getMentorInbox } from "@/lib/mentor/server";
import { MentorDashboard } from "./_components/MentorDashboard";

export const dynamic = "force-dynamic";

export default async function MentorDashboardPage() {
  const mentor = await getMentorContext();
  if (!mentor) redirect("/");

  const inbox = await getMentorInbox(mentor.user.id);

  return (
    <MentorDashboard
      mentorId={mentor.user.id}
      initialInbox={inbox}
      mentorDisplayName={mentor.profile.displayName}
      defaultIdentityNamed={mentor.profile.showIdentityDefault}
    />
  );
}
