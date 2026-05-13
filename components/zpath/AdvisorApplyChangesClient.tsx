"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckSquare,
  Eye,
  Loader2,
  Square,
  X,
} from "lucide-react";

import { supabase } from "@/app/lib/supabase";
import { Button } from "@/components/ui/button";
import type { AdvisorWeightContribution } from "@/lib/advisor-data";
import { ADVISOR_WEIGHT_FIELDS } from "@/lib/advisor-weight-schema";

type LoadState = "loading" | "ready" | "error" | "forbidden";

function getContributorName(contribution: AdvisorWeightContribution) {
  return contribution.contributorName?.trim() || "Ẩn danh";
}

function formatWeight(value: number) {
  return value.toFixed(3);
}

export function AdvisorApplyChangesClient() {
  const [contributions, setContributions] = useState<AdvisorWeightContribution[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedContribution, setSelectedContribution] =
    useState<AdvisorWeightContribution | null>(null);
  const [pendingApplyIds, setPendingApplyIds] = useState<string[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [isApplying, setIsApplying] = useState(false);
  const [message, setMessage] = useState("");

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allSelected =
    contributions.length > 0 && selectedIds.length === contributions.length;

  async function getAccessToken() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  useEffect(() => {
    let isActive = true;

    async function loadContributions() {
      try {
        const token = await getAccessToken();
        if (!token) {
          if (isActive) setLoadState("forbidden");
          return;
        }

        const res = await fetch("/api/advisor/apply-changes", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.status === 401 || res.status === 403) {
          if (isActive) setLoadState("forbidden");
          return;
        }

        if (!res.ok) throw new Error("Cannot load contributions");

        const json = (await res.json()) as {
          contributions: AdvisorWeightContribution[];
        };

        if (isActive) {
          setContributions(json.contributions);
          setLoadState("ready");
        }
      } catch (error) {
        console.error("Cannot load advisor contributions:", error);
        if (isActive) setLoadState("error");
      }
    }

    loadContributions();

    return () => {
      isActive = false;
    };
  }, []);

  const toggleOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const toggleAll = () => {
    setSelectedIds(allSelected ? [] : contributions.map((item) => item.id));
  };

  const requestApply = (ids: string[]) => {
    setPendingApplyIds(ids);
    setMessage("");
  };

  const confirmApply = async () => {
    if (!pendingApplyIds.length) return;

    setIsApplying(true);
    setMessage("");

    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Chưa đăng nhập.");

      const res = await fetch("/api/advisor/apply-changes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ contributionIds: pendingApplyIds }),
      });

      const json = (await res.json().catch(() => null)) as {
        appliedCount?: number;
        updatedMajorCount?: number;
        error?: string;
      } | null;

      if (!res.ok) {
        throw new Error(json?.error ?? "Không thể áp dụng thay đổi.");
      }

      const appliedIds = new Set(pendingApplyIds);
      setContributions((prev) => prev.filter((item) => !appliedIds.has(item.id)));
      setSelectedIds((prev) => prev.filter((id) => !appliedIds.has(id)));
      setPendingApplyIds([]);
      setMessage(
        `Đã áp dụng ${json?.appliedCount ?? pendingApplyIds.length} đóng góp cho ${
          json?.updatedMajorCount ?? 0
        } ngành.`,
      );
    } catch (error) {
      console.error("Cannot apply advisor contributions:", error);
      setMessage(error instanceof Error ? error.message : "Không thể áp dụng thay đổi.");
    } finally {
      setIsApplying(false);
    }
  };

  if (loadState === "loading") {
    return (
      <div className="rounded-2xl border-2 border-border bg-card p-8 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (loadState === "forbidden") {
    return (
      <div className="rounded-2xl border-2 border-dashed border-border p-8 text-center">
        <p className="font-semibold">Bạn cần quyền admin để xem trang này.</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Vui lòng đăng nhập bằng tài khoản admin hoặc kiểm tra role tài khoản.
        </p>
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div className="rounded-2xl border-2 border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Không thể tải danh sách đóng góp.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-4 text-sm text-foreground">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-primary" />
          <p>
            Dữ liệu trọng số sau khi duyệt sẽ được cập nhật theo công thức{" "}
            <span className="font-bold">weight = weight + (weight_change - weight) * 1%</span>{" "}
            cho toàn bộ database trọng số advisor.
          </p>
        </div>
      </div>

      {message ? (
        <div className="rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm font-semibold">
          {message}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border-2 border-border bg-card">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={toggleAll}
            className="inline-flex items-center gap-2 text-sm font-semibold text-foreground"
          >
            {allSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
            Chọn toàn bộ
          </button>
          <Button
            type="button"
            variant="hero"
            disabled={!selectedIds.length || isApplying}
            onClick={() => requestApply(selectedIds)}
          >
            Áp dụng thay đổi đã chọn
          </Button>
        </div>

        {contributions.length ? (
          <div className="divide-y divide-border">
            {contributions.map((contribution) => {
              const checked = selectedIdSet.has(contribution.id);
              return (
                <div
                  key={contribution.id}
                  className="grid gap-4 p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleOne(contribution.id)}
                    className="mt-1 h-4 w-4 accent-primary sm:mt-0"
                    aria-label={`Chọn đóng góp của ${getContributorName(contribution)}`}
                  />

                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => setSelectedContribution(contribution)}
                      className="inline-flex max-w-full items-center gap-2 text-left font-display text-base font-bold text-primary hover:underline"
                    >
                      <span className="truncate">{getContributorName(contribution)}</span>
                      <Eye className="h-4 w-4 shrink-0" />
                    </button>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{contribution.majorName}</span>
                      <span>{contribution.category}</span>
                      <span>
                        {new Date(contribution.createdAt).toLocaleString("vi-VN")}
                      </span>
                    </div>
                    {contribution.reason ? (
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                        {contribution.reason}
                      </p>
                    ) : null}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    disabled={isApplying}
                    onClick={() => requestApply([contribution.id])}
                  >
                    Áp dụng thay đổi
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Chưa có đóng góp đang chờ duyệt.
          </div>
        )}
      </div>

      {selectedContribution ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-background shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-border p-5">
              <div>
                <h2 className="font-display text-xl font-bold">
                  {getContributorName(selectedContribution)}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {selectedContribution.majorName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedContribution(null)}
                className="rounded-full p-2 hover:bg-muted"
                aria-label="Đóng"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[65vh] overflow-auto p-5">
              <div className="grid gap-2 sm:grid-cols-2">
                {ADVISOR_WEIGHT_FIELDS.map((field) => (
                  <div
                    key={field.key}
                    className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-muted-foreground">{field.label}</span>
                    <span className="font-bold">
                      {formatWeight(selectedContribution.weights[field.key])}
                    </span>
                  </div>
                ))}
              </div>
              {selectedContribution.reason ? (
                <div className="mt-4 rounded-xl bg-muted/50 p-4 text-sm">
                  <div className="mb-1 font-semibold">Lý do đề xuất</div>
                  <p className="text-muted-foreground">{selectedContribution.reason}</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {pendingApplyIds.length ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-background p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <span className="rounded-full bg-tier-low-soft p-2 text-tier-low">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-display text-xl font-bold">Xác nhận áp dụng</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Hành động này sẽ cập nhật trọng số gốc và không thể hoàn tác.
                  Bạn đang áp dụng {pendingApplyIds.length} đóng góp.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                disabled={isApplying}
                onClick={() => setPendingApplyIds([])}
              >
                Hủy
              </Button>
              <Button
                type="button"
                variant="hero"
                disabled={isApplying}
                onClick={confirmApply}
              >
                {isApplying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Đang áp dụng
                  </>
                ) : (
                  "Xác nhận"
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
