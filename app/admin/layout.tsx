import { notFound } from "next/navigation";

import { AdminShell } from "@/components/admin/AdminShell";
import { getAuthContext } from "@/lib/zpath-auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const auth = await getAuthContext();
  if (!auth || auth.user.role !== "admin") notFound();

  return <AdminShell>{children}</AdminShell>;
}
