"use client";

import { Button } from "@/components/ui/button";

const STORAGE_KEY = "mentor_identity_warning_seen";

export function hasSeenIdentityWarning(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function markIdentityWarningSeen(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // ignore (private mode etc.)
  }
}

/**
 * Shown the first time a mentor switches to "show real identity" mode.
 * `onConfirm` should persist the choice and apply the switch.
 */
export function IdentityWarningModal({
  open,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-2xl bg-background p-6 shadow-xl">
        <h2 className="text-lg font-black tracking-tight">Bật hiển thị danh tính?</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Khi bạn gửi tin trong chế độ này, học sinh sẽ thấy <strong>tên và avatar thật</strong>{" "}
          của bạn thay vì &ldquo;ZPath Mentor&rdquo;. Bạn có thể tắt bất cứ lúc nào.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel}>
            Huỷ
          </Button>
          <Button variant="hero" onClick={onConfirm}>
            Đã hiểu, bật
          </Button>
        </div>
      </div>
    </div>
  );
}
