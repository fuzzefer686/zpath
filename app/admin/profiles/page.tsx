import { Card, CardContent } from "@/components/ui/card";
import { listAdminProfiles, type AdminProfile } from "@/lib/admin-server";

export default async function AdminProfilesPage() {
  let profiles: AdminProfile[] = [];
  let loadError: string | null = null;

  try {
    profiles = await listAdminProfiles();
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Không thể tải profiles.";
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-black tracking-tight">Profiles</h2>
        <p className="mt-2 text-sm text-muted-foreground">Thông tin hồ sơ người dùng.</p>
      </div>
      {loadError ? (
        <Card>
          <CardContent className="p-6 text-sm text-destructive">{loadError}</CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-muted text-left">
              <tr>
                <th className="px-4 py-3">Tên</th>
                <th className="px-4 py-3">Trường</th>
                <th className="px-4 py-3">Lớp</th>
                <th className="px-4 py-3">Mục tiêu</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {profiles.map((profile) => (
                <tr key={profile.id}>
                  <td className="px-4 py-3 font-semibold">{profile.displayName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{profile.school ?? "-"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{profile.grade ?? "-"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{profile.targetUniversity ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
