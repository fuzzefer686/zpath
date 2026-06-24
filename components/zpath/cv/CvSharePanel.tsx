"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Share2,
  Link2,
  Copy,
  Check,
  Loader2,
  Clock,
  AlertTriangle,
  ShieldAlert,
  Ban,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ActiveShare {
  token: string;
  url: string;
  expiresAt: string; // ISO
}

function formatMmSs(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Public share gate (§10, §13). Default-private CV: publishing a link is opt-in
 * with an explicit PII-publication consent. Under-16 is blocked server-side
 * (the POST returns 403). Links auto-expire in 30 min and can be revoked.
 * Also offers an export-to-self JSON download (not a public share).
 */
export function CvSharePanel() {
  const [share, setShare] = useState<ActiveShare | null>(null);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [blockedUnder16, setBlockedUnder16] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/cv/share");
      if (!res.ok) return;
      const json = (await res.json()) as { share: ActiveShare | null };
      setShare(json.share);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Countdown from expiresAt.
  useEffect(() => {
    if (!share) {
      clearTimer();
      setRemainingMs(0);
      return;
    }
    const target = new Date(share.expiresAt).getTime();
    const tick = () => {
      const left = target - Date.now();
      setRemainingMs(left);
      if (left <= 0) {
        setShare(null); // link is dead
        clearTimer();
      }
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
    return clearTimer;
  }, [share]);

  const handleCreate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setBlockedUnder16(false);
    try {
      const res = await fetch("/api/cv/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ piiAcknowledged: true }),
      });
      const json = await res.json();

      if (res.status === 403 && json.error === "under16_share_blocked") {
        setBlockedUnder16(true);
        return;
      }
      if (!res.ok) {
        setError(json.message || json.error || "Không thể tạo liên kết.");
        return;
      }
      setShare({ token: json.token, url: json.url, expiresAt: json.expiresAt });
      setConsent(false);
    } catch {
      setError("Không thể kết nối. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRevoke = useCallback(async () => {
    setRevoking(true);
    setError(null);
    try {
      const res = await fetch("/api/cv/share", { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error || "Không thể thu hồi.");
        return;
      }
      clearTimer();
      setShare(null);
    } catch {
      setError("Không thể thu hồi liên kết.");
    } finally {
      setRevoking(false);
    }
  }, []);

  const handleCopy = useCallback(async () => {
    if (!share) return;
    try {
      await navigator.clipboard.writeText(share.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard may be blocked; ignore
    }
  }, [share]);

  const handleExportJson = useCallback(async () => {
    setExporting(true);
    setError(null);
    try {
      const res = await fetch("/api/cv/export");
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error || "Không thể xuất JSON.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "zpath-cv.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Không thể xuất JSON.");
    } finally {
      setExporting(false);
    }
  }, []);

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Share2 className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Chia sẻ &amp; xuất CV</span>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Under-16 block */}
      {blockedUnder16 && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          <Ban className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            Tài khoản dưới 16 tuổi (hoặc chưa khai ngày sinh) không thể công khai CV. Theo Luật
            91/2025, việc công bố dữ liệu trẻ em cần đồng ý của người đại diện theo pháp luật. Bạn
            vẫn có thể tải CV về máy ở mục bên dưới.
          </span>
        </div>
      )}

      {/* Active share link */}
      {share ? (
        <div className="space-y-3 rounded-xl border border-primary/20 bg-background p-3">
          <div className="flex items-center gap-2">
            <Link2 className="h-3.5 w-3.5 text-primary shrink-0" />
            <input
              readOnly
              value={share.url}
              className="min-w-0 flex-1 truncate rounded-lg border border-border bg-muted/40 px-2 py-1 text-xs text-foreground"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-7 w-7 shrink-0 p-0 rounded-lg"
              title="Sao chép"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-600">
              <Clock className="h-3 w-3" />
              Hết hạn sau {formatMmSs(remainingMs)}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRevoke}
              disabled={revoking}
              className="h-7 rounded-lg text-xs text-destructive hover:bg-destructive/10"
            >
              {revoking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Thu hồi liên kết"}
            </Button>
          </div>
        </div>
      ) : (
        /* Consent gate */
        <div className="space-y-3">
          <div className="flex items-start gap-2 rounded-xl border border-amber-300/60 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:bg-amber-950/20 dark:text-amber-200">
            <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              CV chứa <strong>thông tin cá nhân</strong>. Khi tạo liên kết, bất kỳ ai có liên kết
              đều xem được CV của bạn (số điện thoại, email, địa chỉ sẽ được ẩn). Liên kết tự hết hạn
              sau 30 phút và bạn có thể thu hồi bất cứ lúc nào.
            </span>
          </div>

          <label className="flex items-start gap-2 text-xs text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-primary"
            />
            <span>
              Tôi hiểu và <strong>đồng ý công bố</strong> thông tin cá nhân trong CV qua liên kết
              chia sẻ.
            </span>
          </label>

          <Button
            onClick={handleCreate}
            disabled={!consent || loading}
            variant="hero"
            size="sm"
            className="w-full rounded-xl gap-1.5"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
            {loading ? "Đang tạo..." : "Tạo liên kết chia sẻ"}
          </Button>
        </div>
      )}

      {/* Export JSON (export-to-self, no age gate) */}
      <div className="border-t border-primary/10 pt-3">
        <Button
          onClick={handleExportJson}
          disabled={exporting}
          variant="outline"
          size="sm"
          className="w-full rounded-xl gap-1.5 text-xs"
        >
          {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          {exporting ? "Đang xuất..." : "Tải CV dạng JSON (để tự dùng / TopCV)"}
        </Button>
      </div>
    </div>
  );
}
