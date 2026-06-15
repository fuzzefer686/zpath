"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import type { MentorProfile } from "@/lib/mentor/types";

type Status =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "success" }
  | { kind: "error"; message: string };

export function MentorSettingsForm({
  initialProfile,
}: {
  initialProfile: MentorProfile;
}) {
  const [displayName, setDisplayName] = useState(initialProfile.displayName);
  const [avatarUrl, setAvatarUrl] = useState(initialProfile.avatarUrl ?? "");
  const [bio, setBio] = useState(initialProfile.bio ?? "");
  const [showIdentityDefault, setShowIdentityDefault] = useState(
    initialProfile.showIdentityDefault,
  );
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus({ kind: "saving" });

    try {
      const res = await fetch("/api/mentor/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName,
          avatar_url: avatarUrl.trim() === "" ? null : avatarUrl,
          bio: bio.trim() === "" ? null : bio,
          show_identity_default: showIdentityDefault,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setStatus({
          kind: "error",
          message: data?.error ?? "Không thể cập nhật. Vui lòng thử lại.",
        });
        return;
      }

      setStatus({ kind: "success" });
    } catch {
      setStatus({ kind: "error", message: "Lỗi mạng. Vui lòng thử lại." });
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label htmlFor="display_name" className="text-sm font-semibold">
              Tên hiển thị
            </label>
            <Input
              id="display_name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={60}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="avatar_url" className="text-sm font-semibold">
              Avatar URL
            </label>
            <Input
              id="avatar_url"
              type="url"
              placeholder="https://..."
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="bio" className="text-sm font-semibold">
              Giới thiệu
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={500}
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          <label className="flex items-start gap-3 rounded-lg border border-border/60 p-3">
            <input
              type="checkbox"
              checked={showIdentityDefault}
              onChange={(e) => setShowIdentityDefault(e.target.checked)}
              className="mt-0.5 h-4 w-4"
            />
            <span className="text-sm">
              <span className="font-semibold">Mặc định hiển thị danh tính</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Khi bật, tin nhắn mới mặc định gửi kèm tên và avatar thật của bạn thay vì
                &ldquo;ZPath Mentor&rdquo;.
              </span>
            </span>
          </label>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={status.kind === "saving"}>
              {status.kind === "saving" ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
            {status.kind === "success" && (
              <span className="text-sm font-medium text-green-600">Đã lưu.</span>
            )}
            {status.kind === "error" && (
              <span className="text-sm font-medium text-destructive">{status.message}</span>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
