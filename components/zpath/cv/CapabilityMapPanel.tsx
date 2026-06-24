"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Map,
  Sparkles,
  Check,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  Info,
  PauseCircle,
  ExternalLink,
  AlertTriangle,
  BookOpen,
  Compass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CvResultsModal } from "./CvResultsModal";

type CatKey = "skill" | "cert" | "course" | "career";

const ACTION_TO_CAT: Record<T16T17Action, CatKey> = {
  run_analyze_skill_gap: "skill",
  run_analyze_cert_gap: "cert",
  run_recommend_courses: "course",
  run_suggest_career_direction: "career",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type RecoType = "skill_gap" | "cert_gap" | "course" | "career_direction";

interface GapReco {
  id: string;
  type: RecoType;
  payload: Record<string, unknown>;
  rationale: string | null;
  source_model: string | null;
  status: "pending" | "accepted" | "dismissed";
  generated_at: string;
}

type T16T17Action =
  | "run_analyze_skill_gap"
  | "run_analyze_cert_gap"
  | "run_recommend_courses"
  | "run_suggest_career_direction";

interface SponsoredPlacement {
  id: string;
  sponsor_name: string;
  title: string;
  poster_url: string | null;
  target_url: string;
  discount_label: string | null;
  context_tags: string[] | null;
}

const IMPORTANCE_LABEL: Record<string, string> = {
  high: "Cao",
  medium: "Vừa",
  low: "Thấp",
};

const IMPORTANCE_CLASS: Record<string, string> = {
  high: "bg-red-500/10 text-red-600 border-red-200",
  medium: "bg-amber-500/10 text-amber-600 border-amber-200",
  low: "bg-muted text-muted-foreground border-border",
};

const FIT_LABEL: Record<string, string> = {
  high: "Rất hợp",
  medium: "Hợp",
};

const FIT_CLASS: Record<string, string> = {
  high: "bg-green-500/10 text-green-700 border-green-200",
  medium: "bg-blue-500/10 text-blue-700 border-blue-200",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function CapabilityMapPanel() {
  const [recos, setRecos] = useState<GapReco[]>([]);
  const [aiEnabled, setAiEnabled] = useState<boolean | null>(null);
  const [loadingFetch, setLoadingFetch] = useState(false);
  const [loadingAction, setLoadingAction] = useState<T16T17Action | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  // Which result category is open in the popup (null = closed).
  const [activeCat, setActiveCat] = useState<CatKey | null>(null);

  const [sponsoredPlacements, setSponsoredPlacements] = useState<SponsoredPlacement[]>([]);

  const fetchRecos = useCallback(async () => {
    setLoadingFetch(true);
    try {
      const res = await fetch("/api/cv/ai");
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as {
        recommendations: GapReco[];
        aiEnabled?: boolean;
      };
      // Only keep T16/T17 types in this panel.
      const t16t17 = (json.recommendations ?? []).filter(
        (r) =>
          r.type === "cert_gap" ||
          r.type === "course" ||
          r.type === "career_direction" ||
          (r.type === "skill_gap" &&
            (r.payload as { source_task?: string }).source_task === "analyze_skill_gap"),
      );
      setRecos(t16t17);
      if (typeof json.aiEnabled === "boolean") setAiEnabled(json.aiEnabled);
    } catch {
      // non-critical — panel just shows empty
    } finally {
      setLoadingFetch(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRecos();
  }, [fetchRecos]);

  // Extract unique tags from current recommendations
  const getContextTags = useCallback(() => {
    const tags = new Set<string>();
    recos.forEach((r) => {
      if (r.type === "skill_gap") {
        const name = (r.payload as { name?: string })?.name;
        if (name) tags.add(name.toLowerCase());
        const category = (r.payload as { category?: string })?.category;
        if (category) tags.add(category.toLowerCase());
      }
      if (r.type === "cert_gap") {
        const certName = (r.payload as { certName?: string })?.certName;
        if (certName) tags.add(certName.toLowerCase());
        const certTypeCode = (r.payload as { certTypeCode?: string })?.certTypeCode;
        if (certTypeCode) tags.add(certTypeCode.toLowerCase());
      }
      if (r.type === "course") {
        const courseTags = (r.payload as { tags?: string[] })?.tags;
        if (Array.isArray(courseTags)) {
          courseTags.forEach((t) => tags.add(t.toLowerCase()));
        }
      }
    });
    return Array.from(tags);
  }, [recos]);

  // Fetch sponsored placements matching context tags
  useEffect(() => {
    const fetchSponsored = async () => {
      const tags = getContextTags();
      try {
        const url = `/api/sponsored?tags=${encodeURIComponent(tags.join(","))}`;
        const res = await fetch(url);
        if (res.ok) {
          const json = (await res.json()) as { placements?: SponsoredPlacement[] };
          setSponsoredPlacements(json.placements ?? []);
        }
      } catch (err) {
        console.error("Failed to fetch sponsored placements:", err);
      }
    };

    fetchSponsored();
  }, [recos, getContextTags]);

  const runTask = async (action: T16T17Action) => {
    setLoadingAction(action);
    setError(null);
    try {
      const res = await fetch("/api/cv/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = (await res.json()) as {
        status?: string;
        skipped?: boolean;
        skipReason?: string;
        error?: string;
        recommendations?: GapReco[];
      };

      if ((json as { status?: string }).status === "ai_disabled") {
        setAiEnabled(false);
        return;
      }

      if (!res.ok) {
        setError(json.error ?? "Lỗi không xác định.");
        return;
      }

      if (json.skipped) {
        const reason =
          json.skipReason === "ai_not_configured"
            ? "Chức năng AI chưa được cấu hình."
            : json.skipReason === "under16_skipped"
              ? "Gợi ý AI không khả dụng cho tài khoản dưới 16 tuổi."
              : "Gợi ý AI tạm thời không khả dụng.";
        setError(reason);
        return;
      }

      const newItems = json.recommendations ?? [];
      if (newItems.length > 0) {
        setRecos((prev) => {
          // Replace existing rows of same type + source_task
          const isSameSlot = (r: GapReco) => {
            if (newItems[0].type === "skill_gap") {
              return (
                r.type === "skill_gap" &&
                (r.payload as { source_task?: string }).source_task === "analyze_skill_gap"
              );
            }
            return r.type === newItems[0].type;
          };
          return [...prev.filter((r) => !isSameSlot(r)), ...newItems];
        });
        // Auto-open the popup for the category just generated.
        setActiveCat(ACTION_TO_CAT[action]);
      }
    } catch (err) {
      setError("Không thể kết nối. Vui lòng thử lại.");
      console.error(err);
    } finally {
      setLoadingAction(null);
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
      setRecos((prev) => prev.filter((r) => r.id !== id));
    } catch {
      setError("Không thể cập nhật trạng thái.");
    } finally {
      setActionLoading(null);
    }
  };

  // Categorise pending recos.
  const skillGaps = recos.filter(
    (r) =>
      r.type === "skill_gap" &&
      (r.payload as { source_task?: string }).source_task === "analyze_skill_gap",
  );
  const certGaps = recos.filter((r) => r.type === "cert_gap");
  const courses = recos.filter((r) => r.type === "course");
  const careers = recos.filter((r) => r.type === "career_direction");
  const totalPending = recos.length;

  // Category metadata for the result chips + popup.
  const CATS: { key: CatKey; label: string; icon: React.ReactNode; items: GapReco[] }[] = [
    { key: "skill", label: "Kỹ năng cần bổ sung", icon: <Sparkles className="h-3.5 w-3.5" />, items: skillGaps },
    { key: "cert", label: "Chứng chỉ cần có", icon: <AlertTriangle className="h-3.5 w-3.5" />, items: certGaps },
    { key: "course", label: "Khoá học gợi ý", icon: <BookOpen className="h-3.5 w-3.5" />, items: courses },
    { key: "career", label: "Định hướng nghề nghiệp", icon: <Compass className="h-3.5 w-3.5" />, items: careers },
  ];
  const activeCatMeta = CATS.find((c) => c.key === activeCat) ?? null;

  // Render the compact GapCard rows for a category (shown inside the popup).
  const renderCards = (key: CatKey) =>
    (CATS.find((c) => c.key === key)?.items ?? []).map((r) => {
      const p = r.payload as Record<string, unknown>;
      const common = {
        rationale: r.rationale,
        sourceModel: r.source_model,
        isActing: actionLoading === r.id,
        onAccept: () => updateStatus(r.id, "accepted"),
        onDismiss: () => updateStatus(r.id, "dismissed"),
      };
      if (key === "skill")
        return (
          <GapCard key={r.id} {...common} label={(p.name as string) ?? "Kỹ năng"} sublabel={p.category as string}
            badge={p.importance as string} badgeLabel={IMPORTANCE_LABEL[(p.importance as string) ?? ""] ?? ""}
            badgeClass={IMPORTANCE_CLASS[(p.importance as string) ?? "low"]} acceptLabel="Ghi nhận" dismissLabel="Bỏ qua" />
        );
      if (key === "cert")
        return (
          <GapCard key={r.id} {...common} label={(p.certName as string) ?? "Chứng chỉ"} sublabel={(p.certTypeCode as string) ?? undefined}
            badge={p.importance as string} badgeLabel={IMPORTANCE_LABEL[(p.importance as string) ?? ""] ?? ""}
            badgeClass={IMPORTANCE_CLASS[(p.importance as string) ?? "low"]} acceptLabel="Ghi nhận" dismissLabel="Bỏ qua" />
        );
      if (key === "course")
        return (
          <GapCard key={r.id} {...common} label={(p.name as string) ?? "Khoá học"} sublabel={(p.provider as string) ?? undefined}
            tags={p.tags as string[] | undefined} acceptLabel="Lưu lại" dismissLabel="Bỏ qua" externalUrl={(p.url as string) ?? null} />
        );
      return (
        <GapCard key={r.id} {...common} label={(p.title as string) ?? "Định hướng"} badge={p.fit as string}
          badgeLabel={FIT_LABEL[(p.fit as string) ?? ""] ?? ""} badgeClass={FIT_CLASS[(p.fit as string) ?? "medium"]}
          acceptLabel="Quan tâm" dismissLabel="Không phù hợp" />
      );
    });

  const btn = (action: T16T17Action, icon: React.ReactNode, label: string) => (
    <Button
      variant="outline"
      size="sm"
      disabled={loadingAction === action}
      onClick={() => runTask(action)}
      className="rounded-xl text-xs h-8 gap-1.5 border-primary/30 hover:bg-primary/5 hover:text-primary"
    >
      {loadingAction === action ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        icon
      )}
      {loadingAction === action ? "Đang phân tích..." : label}
    </Button>
  );

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-white/60 p-6 shadow-glow backdrop-blur-xl transition hover:shadow-lg space-y-4 dark:border-white/10 dark:bg-zinc-900/60">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-muted/55 pb-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/20">
            <Map className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-display text-lg font-bold tracking-tight text-foreground">Bản đồ năng lực</h3>
              {totalPending > 0 && (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  {totalPending} chờ duyệt
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">Phân tích khoảng cách kỹ năng, chứng chỉ, khoá học &amp; nghề.</p>
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
              Tính năng phân tích AI đang tạm dừng.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {btn(
                "run_analyze_skill_gap",
                <Sparkles className="h-3.5 w-3.5 text-primary" />,
                "Thiếu kỹ năng",
              )}
              {btn(
                "run_analyze_cert_gap",
                <AlertTriangle className="h-3.5 w-3.5 text-primary" />,
                "Thiếu chứng chỉ",
              )}
              {btn(
                "run_recommend_courses",
                <BookOpen className="h-3.5 w-3.5 text-primary" />,
                "Gợi ý khoá học",
              )}
              {btn(
                "run_suggest_career_direction",
                <Compass className="h-3.5 w-3.5 text-primary" />,
                "Định hướng nghề",
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          {loadingFetch && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang tải...
            </div>
          )}

          {/* Result chips — open the popup instead of a long inline list */}
          {!loadingFetch && totalPending > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Kết quả phân tích — bấm để xem
              </p>
              <div className="flex flex-wrap gap-2">
                {CATS.filter((c) => c.items.length > 0).map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setActiveCat(c.key)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-primary/10 hover:text-primary"
                  >
                    <span className="text-primary">{c.icon}</span>
                    {c.label}
                    <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                      {c.items.length}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!loadingFetch && totalPending === 0 && !error && (
            <p className="text-xs text-muted-foreground">
              Nhấn nút để phân tích khoảng cách năng lực. Kết quả chỉ lưu sau khi bạn xác nhận.
            </p>
          )}

          {/* Sponsored Placements Section */}
          {sponsoredPlacements.length > 0 && (
            <div className="border-t border-primary/10 pt-4 mt-4 space-y-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Nội dung tài trợ
                </span>
                <span className="bg-primary/15 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-primary/20 uppercase tracking-wide">
                  Tài trợ
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {sponsoredPlacements.map((ad) => (
                  <a
                    key={ad.id}
                    href={`/api/sponsored/click?id=${ad.id}&context=capability_map`}
                    className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card transition hover:border-primary"
                  >
                    {ad.poster_url && (
                      <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={ad.poster_url}
                          alt={ad.title}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        />
                        {ad.discount_label && (
                          <span className="absolute left-2 top-2 rounded-full bg-red-500/90 px-2 py-0.5 text-[9px] font-bold text-white uppercase">
                            {ad.discount_label}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex flex-1 flex-col p-3">
                      <div className="flex-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                          {ad.sponsor_name}
                        </span>
                        <h5 className="mt-0.5 font-display text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                          {ad.title}
                        </h5>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs font-semibold text-primary">
                        <span>Tìm hiểu thêm</span>
                        <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Results popup — keeps long lists off the page */}
      <CvResultsModal
        open={!!activeCatMeta}
        onClose={() => setActiveCat(null)}
        title={activeCatMeta?.label ?? ""}
        icon={activeCatMeta?.icon}
        count={activeCatMeta?.items.length}
        subtitle="Bấm vào từng mục để xem lý do. ✓ ghi nhận, ✗ bỏ qua."
      >
        {activeCat && renderCards(activeCat)}
      </CvResultsModal>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface GapCardProps {
  label: string;
  sublabel?: string;
  badge?: string;
  badgeLabel?: string;
  badgeClass?: string;
  tags?: string[];
  rationale: string | null;
  sourceModel: string | null;
  isActing: boolean;
  acceptLabel: string;
  dismissLabel: string;
  externalUrl?: string | null;
  onAccept: () => void;
  onDismiss: () => void;
}

function GapCard({
  label,
  sublabel,
  badge,
  badgeLabel,
  badgeClass,
  tags,
  rationale,
  sourceModel,
  isActing,
  acceptLabel,
  dismissLabel,
  externalUrl,
  onAccept,
  onDismiss,
}: GapCardProps) {
  const [open, setOpen] = useState(false);
  const hasDetail = Boolean(rationale || sublabel || (tags && tags.length));

  return (
    <div className="rounded-xl border border-border bg-background">
      {/* Compact one-line row */}
      <div className="flex items-center gap-1.5 p-2 pl-2.5">
        <button
          type="button"
          onClick={() => hasDetail && setOpen((v) => !v)}
          className={`flex min-w-0 flex-1 items-center gap-2 text-left ${hasDetail ? "cursor-pointer" : "cursor-default"}`}
        >
          {hasDetail && (
            <ChevronDown
              className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
            />
          )}
          <span className="truncate text-sm font-medium text-foreground">{label}</span>
          {badge && badgeLabel && (
            <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${badgeClass}`}>
              {badgeLabel}
            </span>
          )}
        </button>

        <div className="flex shrink-0 items-center gap-0.5">
          {externalUrl && (
            <a
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Xem khoá học"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          <Button
            variant="ghost"
            size="sm"
            disabled={isActing}
            onClick={onDismiss}
            title={dismissLabel}
            className="h-7 w-7 rounded-lg p-0 hover:bg-destructive/10 hover:text-destructive"
          >
            {isActing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={isActing}
            onClick={onAccept}
            title={acceptLabel}
            className="h-7 w-7 rounded-lg p-0 hover:bg-green-500/10 hover:text-green-600"
          >
            {isActing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* Detail — collapsed by default to keep the list short */}
      {open && hasDetail && (
        <div className="space-y-1.5 border-t border-border/50 px-2.5 pb-2.5 pt-2">
          {sublabel && <span className="block text-xs capitalize text-muted-foreground">{sublabel}</span>}
          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.map((t) => (
                <span key={t} className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {t}
                </span>
              ))}
            </div>
          )}
          {rationale && (
            <p className="text-xs leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground/70">Lý do: </span>
              {rationale}
            </p>
          )}
          {sourceModel && <p className="text-[10px] text-muted-foreground/60">Nguồn: {sourceModel}</p>}
        </div>
      )}
    </div>
  );
}
