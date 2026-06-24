"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Download, FileText, Loader2, Trash2, Clock, AlertTriangle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExportResult {
  url: string;
  cvId: string;
  purgeAt: string; // ISO
}

function formatMmSs(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Ephemeral CV export (§13.8). Publishing a CV (PDF) bundles the user's PII, so
 * it is gated behind an explicit consent acknowledgement (§13.3) before render.
 * The file lives 30 minutes then a background job hard-deletes it. The countdown
 * is UX only — purge happens server-side regardless of this tab.
 */
export function CvExportPanel() {
  const [consent, setConsent] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExportResult | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const [expired, setExpired] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Drive the countdown from purge_at.
  useEffect(() => {
    if (!result) return;
    const target = new Date(result.purgeAt).getTime();
    const tick = () => {
      const left = target - Date.now();
      setRemainingMs(left);
      if (left <= 0) {
        setExpired(true);
        setResult(null);
        clearTimer();
      }
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
    return clearTimer;
  }, [result]);

  const handleRender = useCallback(async () => {
    setIsRendering(true);
    setError(null);
    setExpired(false);
    try {
      const res = await fetch("/api/cv/render", { method: "POST" });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || "Xuất bản CV thất bại.");
      setResult({ url: json.url, cvId: json.cvId, purgeAt: json.purgeAt });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi khi xuất bản CV.");
    } finally {
      setIsRendering(false);
    }
  }, []);

  const handlePurgeNow = useCallback(async () => {
    setIsPurging(true);
    setError(null);
    try {
      const res = await fetch("/api/cv/purge-now", { method: "POST" });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || "Xoá thất bại.");
      clearTimer();
      setResult(null);
      setExpired(false);
      setRemainingMs(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi khi xoá CV.");
    } finally {
      setIsPurging(false);
    }
  }, []);

  const progressPct = Math.max(0, Math.min(100, (remainingMs / (30 * 60 * 1000)) * 100));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-white/20 bg-white/60 p-6 shadow-glow backdrop-blur-xl transition hover:shadow-lg dark:border-white/10 dark:bg-zinc-900/60"
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

      {/* Header */}
      <div className="flex items-center gap-3 border-b border-muted/55 pb-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/20">
          <FileText className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-lg font-bold tracking-tight text-foreground">Xuất bản CV (PDF)</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            File chỉ tồn tại 30 phút rồi tự động xoá khỏi máy chủ để bảo vệ dữ liệu cá nhân.
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="mt-5 space-y-4">
        {!result && (
          <>
            {/* Consent gate (§13.3) */}
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-300/50 bg-amber-50/70 p-3.5 text-xs leading-relaxed text-amber-900 dark:border-amber-400/20 dark:bg-amber-950/20 dark:text-amber-200">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-amber-400 accent-primary"
              />
              <span className="flex items-start gap-1.5">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  CV chứa <strong className="font-semibold">thông tin cá nhân</strong> (họ tên, liên hệ, điểm số).
                  Tôi đồng ý xuất bản bản PDF chứa các thông tin này.
                </span>
              </span>
            </label>

            <Button
              onClick={handleRender}
              disabled={isRendering || !consent}
              variant="hero"
              size="lg"
              className="w-full gap-2 rounded-xl"
            >
              {isRendering ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              {isRendering ? "Đang tạo CV..." : "Tạo CV"}
            </Button>
          </>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-xs text-destructive">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </div>
        )}

        {expired && !result && (
          <div className="rounded-xl border border-muted/50 bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
            Liên kết đã hết hạn và file đã được xoá khỏi máy chủ. Tick đồng ý và bấm “Tạo CV” để tạo lại.
          </div>
        )}

        {result && (
          <div className="space-y-3 rounded-xl border border-primary/15 bg-primary/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
              >
                <Download className="h-4 w-4" />
                Tải xuống CV
              </a>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                <Clock className="h-3 w-3" />
                Tự xoá sau {formatMmSs(remainingMs)}
              </span>
            </div>

            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-500 transition-all duration-1000"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <Button
              onClick={handlePurgeNow}
              disabled={isPurging}
              variant="ghost"
              size="sm"
              className="flex h-8 w-full items-center justify-center gap-1.5 rounded-lg text-destructive hover:bg-destructive/10"
            >
              {isPurging ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Xoá ngay khỏi máy chủ
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
