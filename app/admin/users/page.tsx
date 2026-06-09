import { Card, CardContent } from "@/components/ui/card";
import { listAdminUsers, type AdminUser } from "@/lib/admin-server";

export default async function AdminUsersPage() {
  let users: AdminUser[] = [];
  let loadError: string | null = null;

  try {
    users = await listAdminUsers();
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Không thể tải users.";
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-black tracking-tight">Users</h2>
        <p className="mt-2 text-sm text-muted-foreground">Tài khoản và role trong ZPATH.</p>
      </div>
      {loadError ? (
        <Card>
          <CardContent className="p-6 text-sm text-destructive">{loadError}</CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-muted text-left">
              <tr>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Provider</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-3 font-semibold">{user.username}</td>
                  <td className="px-4 py-3 text-muted-foreground">{user.email ?? "-"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{user.phone ?? "-"}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold uppercase">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{user.authProvider ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
