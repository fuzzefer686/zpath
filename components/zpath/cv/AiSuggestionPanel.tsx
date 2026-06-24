"use client";

import { useCallback, useEffect, useState } from "react";
import { Sparkles, Check, X, Loader2, ChevronDown, ChevronUp, Info, PauseCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CvResultsModal } from "./CvResultsModal";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type RecoType = "summary_suggestion" | "skill_gap";

interface Recommendation {
  id: string;
  type: RecoType;
  payload: Record<string, unknown>;
  rationale: string | null;
  source_model: string | null;
  status: "pending" | "accepted" | "dismissed";
  generated_at: string;
}

interface AiSuggestionPanelProps {
  /** Called after a summary_suggestion is accepted so the parent can re-fetch cv_profiles. */
  onSummaryAccepted?: () => void;
  /** Called after a skill_gap suggestion is accepted so the parent can re-fetch cv_skills. */
  onSkillAccepted?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function AiSuggestionPanel({ onSummaryAccepted, onSkillAccepted }: AiSuggestionPanelProps) {
  const [recos, setRecos] = useState<Recommendation[]>([]);
  const [aiEnabled, setAiEnabled] = useState<boolean | null>(null);
  const [loadingFetch, setLoadingFetch] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingSkills, setLoadingSkills] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  // Which result group is open in the popup (null = closed).
  const [modalKind, setModalKind] = useState<"summary" | "skill" | null>(null);

  const fetchRecos = useCallback(async () => {
    setLoadingFetch(true);
    try {
      const res = await fetch("/api/cv/ai");
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as {
        recommendations: Recommendation[];
        aiEnabled?: boolean;
      };
      setRecos(json.recommendations ?? []);
      if (typeof json.aiEnabled === "boolean") setAiEnabled(json.aiEnabled);
    } catch {
      // non-critical — panel just shows empty; aiEnabled stays null (unknown)
    } finally {
      setLoadingFetch(false);
    }
  }, []);

  useEffect(() => {
    fetchRecos();
  }, [fetchRecos]);

  const runTask = async (action: "run_enrich_summary" | "run_suggest_skills") => {
    const setLoading = action === "run_enrich_summary" ? setLoadingSummary : setLoadingSkills;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cv/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = (await res.json()) as {
        skipped?: boolean;
        skipReason?: string;
        error?: string;
        recommendation?: Recommendation;
        recommendations?: Recommendation[];
      };

      if (!res.ok) {
        setError(json.error ?? "Lỗi không xác định.");
        return;
      }

      if ((json as { status?: string }).status === "ai_disabled") {
        setAiEnabled(false);
        return;
      }

      if (json.skipped) {
        const reason =
          json.skipReason === "ai_not_configured"
            ? "Chức năng AI chưa được cấu hình. Vui lòng liên hệ quản trị viên."
            : json.skipReason === "under16_skipped"
              ? "Gợi ý AI không khả dụng cho tài khoản dưới 16 tuổi."
              : "Gợi ý AI tạm thời không khả dụng.";
        setError(reason);
        return;
      }

      // Merge new recommendations, replacing stale ones of the same type.
      const newItems: Recommendation[] = json.recommendation
        ? [json.recommendation]
        : (json.recommendations ?? []);

      if (newItems.length > 0) {
        const types = new Set(newItems.map((r) => r.type));
        // Keep recommendations of OTHER types; replace current type with fresh results.
        setRecos((prev) => [
          ...prev.filter((r) => !types.has(r.type)),
          ...newItems,
        ]);
        setExpanded(true);
        // Auto-open the popup for the group just generated.
        setModalKind(action === "run_enrich_summary" ? "summary" : "skill");
      }
    } catch (err) {
      setError("Không thể kết nối. Vui lòng thử lại.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: "accepted" | "dismissed") => {
    setActionLoading(id);
    try {
      const res = await fetch("/api/cv/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_recommendation_status", id, status }),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        setError(json.error ?? "Không thể cập nhật.");
        return;
      }

      const reco = recos.find((r) => r.id === id);
      setRecos((prev) => prev.filter((r) => r.id !== id));

      if (status === "accepted" && reco) {
        if (reco.type === "summary_suggestion") onSummaryAccepted?.();
        if (reco.type === "skill_gap") onSkillAccepted?.();
      }
    } catch {
      setError("Không thể cập nhật trạng thái.");
    } finally {
      setActionLoading(null);
    }
  };

  const summaryRecos = recos.filter((r) => r.type === "summary_suggestion");
  // Only show T15 suggest_skills rows here; T16 analyze_skill_gap rows go to CapabilityMapPanel.
  const skillRecos = recos.filter(
    (r) => r.type === "skill_gap" &&
      (r.payload as { source_task?: string }).source_task === "suggest_skills",
  );
  const hasRecos = summaryRecos.length > 0 || skillRecos.length > 0;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-white/60 p-6 shadow-glow backdrop-blur-xl transition hover:shadow-lg space-y-4 dark:border-white/10 dark:bg-zinc-900/60">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-muted/55 pb-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/20">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-display text-lg font-bold tracking-tight text-foreground">Gợi ý AI</h3>
              {hasRecos && (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  {recos.length} chờ duyệt
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">Tóm tắt &amp; kỹ năng gợi ý từ hồ sơ của bạn.</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded((v) => !v)}
          className="h-8 w-8 shrink-0 rounded-xl p-0"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {expanded && (
        <>
          {/* Trigger buttons or kill-switch banner */}
          {aiEnabled === false ? (
            <div className="flex items-center gap-2 rounded-xl bg-muted/60 border border-border px-3 py-2.5 text-xs text-muted-foreground">
              <PauseCircle className="h-3.5 w-3.5 shrink-0" />
              Tính năng gợi ý AI đang tạm dừng.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={loadingSummary}
                onClick={() => runTask("run_enrich_summary")}
                className="rounded-xl text-xs h-8 gap-1.5 border-primary/30 hover:bg-primary/5 hover:text-primary"
              >
                {loadingSummary ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                )}
                {loadingSummary ? "Đang tạo..." : "Gợi ý tóm tắt"}
              </Button>

              <Button
                variant="outline"
                size="sm"
                disabled={loadingSkills}
                onClick={() => runTask("run_suggest_skills")}
                className="rounded-xl text-xs h-8 gap-1.5 border-primary/30 hover:bg-primary/5 hover:text-primary"
              >
                {loadingSkills ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                )}
                {loadingSkills ? "Đang tạo..." : "Gợi ý kỹ năng"}
              </Button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          {/* Pending recommendations */}
          {loadingFetch && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang tải gợi ý...
            </div>
          )}

          {/* Result chips — open the popup instead of a long inline list */}
          {!loadingFetch && hasRecos && (
            <div className="flex flex-wrap gap-2">
              {summaryRecos.length > 0 && (
                <button
                  type="button"
                  onClick={() => setModalKind("summary")}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-primary/10 hover:text-primary"
                >
                  <Sparkles className="h-3.5 w-3.5 text-primary" /> Gợi ý tóm tắt
                  <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">{summaryRecos.length}</span>
                </button>
              )}
              {skillRecos.length > 0 && (
                <button
                  type="button"
                  onClick={() => setModalKind("skill")}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-primary/10 hover:text-primary"
                >
                  <Sparkles className="h-3.5 w-3.5 text-primary" /> Kỹ năng gợi ý
                  <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">{skillRecos.length}</span>
                </button>
              )}
            </div>
          )}

          {!loadingFetch && !hasRecos && !error && (
            <p className="text-xs text-muted-foreground">
              Nhấn nút để nhận gợi ý AI dựa trên hồ sơ của bạn. Gợi ý chỉ áp dụng sau khi bạn xác nhận.
            </p>
          )}
        </>
      )}

      {/* Results popup */}
      <CvResultsModal
        open={modalKind !== null}
        onClose={() => setModalKind(null)}
        title={modalKind === "summary" ? "Gợi ý tóm tắt hồ sơ" : "Kỹ năng gợi ý"}
        icon={<Sparkles className="h-4 w-4" />}
        count={modalKind === "summary" ? summaryRecos.length : skillRecos.length}
        subtitle="✓ áp dụng vào CV, ✗ bỏ qua."
      >
        {modalKind === "summary" &&
          summaryRecos.map((reco) => {
            const p = reco.payload as { headline?: string; summary?: string };
            return (
              <RecoCard
                key={reco.id}
                label="Gợi ý tóm tắt hồ sơ"
                rationale={reco.rationale}
                sourceModel={reco.source_model}
                isActing={actionLoading === reco.id}
                onAccept={() => updateStatus(reco.id, "accepted")}
                onDismiss={() => updateStatus(reco.id, "dismissed")}
              >
                {p.headline && (
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-muted-foreground">Tiêu đề</span>
                    <p className="text-sm font-medium text-foreground">{p.headline}</p>
                  </div>
                )}
                {p.summary && (
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-muted-foreground">Tóm tắt</span>
                    <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">{p.summary}</p>
                  </div>
                )}
              </RecoCard>
            );
          })}
        {modalKind === "skill" &&
          skillRecos.map((reco) => {
            const p = reco.payload as { name?: string; category?: string };
            return (
              <RecoCard
                key={reco.id}
                label={p.name ?? "Kỹ năng"}
                sublabel={p.category}
                rationale={reco.rationale}
                sourceModel={reco.source_model}
                isActing={actionLoading === reco.id}
                onAccept={() => updateStatus(reco.id, "accepted")}
                onDismiss={() => updateStatus(reco.id, "dismissed")}
                compact
              />
            );
          })}
      </CvResultsModal>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recommendation card — reused for both summary and skill suggestions.
// ---------------------------------------------------------------------------
interface RecoCardProps {
  label: string;
  sublabel?: string;
  rationale: string | null;
  sourceModel: string | null;
  isActing: boolean;
  onAccept: () => void;
  onDismiss: () => void;
  compact?: boolean;
  children?: React.ReactNode;
}

function RecoCard({
  label,
  sublabel,
  rationale,
  sourceModel,
  isActing,
  onAccept,
  onDismiss,
  compact = false,
  children,
}: RecoCardProps) {
  return (
    <div className="rounded-xl border border-border bg-background p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="text-sm font-semibold text-foreground line-clamp-2">{label}</span>
          {sublabel && (
            <span className="text-xs text-muted-foreground capitalize"> · {sublabel}</span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            disabled={isActing}
            onClick={onDismiss}
            title="Bỏ qua"
            className="h-7 w-7 p-0 rounded-xl hover:bg-destructive/10 hover:text-destructive"
          >
            {isActing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={isActing}
            onClick={onAccept}
            title="Áp dụng vào CV"
            className="h-7 w-7 p-0 rounded-xl hover:bg-green-500/10 hover:text-green-600"
          >
            {isActing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {!compact && children && <div className="space-y-2">{children}</div>}

      {rationale && (
        <p className="text-xs text-muted-foreground leading-relaxed border-t border-border/50 pt-2">
          <span className="font-medium text-foreground/70">Lý do: </span>
          {rationale}
        </p>
      )}

      {sourceModel && (
        <p className="text-[10px] text-muted-foreground/60">Nguồn: {sourceModel}</p>
      )}
    </div>
  );
}
