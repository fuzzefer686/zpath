"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Send, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, NumberInput } from "@/components/zpath/FormFields";
import {
  ADVISOR_SCORE_WEIGHT_FIELDS,
  ADVISOR_SUBJECT_WEIGHT_FIELDS,
  emptyAdvisorWeightValues,
  type AdvisorWeightValues,
} from "@/lib/advisor-weight-schema";

type AdvisorContributionMajor = {
  majorId: string;
  name: string;
  category: string;
  description: string;
  weights: AdvisorWeightValues;
};

type SubmitState = "idle" | "submitting" | "success" | "error";

const inputClassName = "h-10 rounded-lg px-3 text-sm";

export function AdvisorContributeForm() {
  const [majors, setMajors] = useState<AdvisorContributionMajor[]>([]);
  const [selectedMajorId, setSelectedMajorId] = useState("");
  const [weights, setWeights] = useState<AdvisorWeightValues>(emptyAdvisorWeightValues);
  const [contributorName, setContributorName] = useState("");
  const [contributorEmail, setContributorEmail] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadWeights() {
      try {
        const res = await fetch("/api/advisor/weights");
        if (!res.ok) throw new Error("Cannot load advisor weights");

        const json = (await res.json()) as { majors: AdvisorContributionMajor[] };
        if (ignore) return;

        setMajors(json.majors);
        const firstMajor = json.majors[0];
        if (firstMajor) {
          setSelectedMajorId(firstMajor.majorId);
          setWeights(firstMajor.weights);
        }
      } catch (error) {
        console.error("Advisor contribution load error:", error);
        if (!ignore) {
          setErrorMessage("Không thể tải dữ liệu trọng số.");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadWeights();

    return () => {
      ignore = true;
    };
  }, []);

  const selectedMajor = useMemo(
    () => majors.find((major) => major.majorId === selectedMajorId) ?? null,
    [majors, selectedMajorId],
  );

  const scoreWeightTotal = useMemo(
    () =>
      ADVISOR_SCORE_WEIGHT_FIELDS.reduce(
        (total, field) => total + weights[field.key],
        0,
      ),
    [weights],
  );

  const handleMajorChange = (majorId: string) => {
    setSelectedMajorId(majorId);
    const nextMajor = majors.find((major) => major.majorId === majorId);
    if (nextMajor) {
      setWeights(nextMajor.weights);
    }
  };

  const updateWeight = (key: keyof AdvisorWeightValues, value: string) => {
    const numeric = Number(value);
    setWeights((prev) => ({
      ...prev,
      [key]: Number.isNaN(numeric) ? 0 : numeric,
    }));
  };

  const submitContribution = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedMajorId) return;

    setSubmitState("submitting");
    setErrorMessage("");

    try {
      const res = await fetch("/api/advisor/contributions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          majorId: selectedMajorId,
          weights,
          contributorName,
          contributorEmail,
          reason,
        }),
      });

      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(json?.error || "Cannot submit contribution");
      }

      setSubmitState("success");
      setReason("");
    } catch (error) {
      console.error("Advisor contribution submit error:", error);
      setSubmitState("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Không thể lưu đóng góp.",
      );
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border-2 border-border bg-card p-8 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!majors.length) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Không có dữ liệu ngành để đóng góp.
      </div>
    );
  }

  return (
    <form onSubmit={submitContribution} className="rounded-2xl border-2 border-border bg-card p-5 shadow-sm sm:p-7">
      <div className="space-y-7">
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <SlidersHorizontal className="h-4 w-4" />
            </span>
            <h2 className="font-display text-xl font-bold">Chọn ngành</h2>
          </div>

          <Field label="Ngành học">
            <select
              value={selectedMajorId}
              onChange={(event) => handleMajorChange(event.target.value)}
              className="h-12 w-full rounded-xl border-2 border-border bg-background px-4 text-sm font-semibold outline-none transition-colors focus:border-primary"
            >
              {majors.map((major) => (
                <option key={major.majorId} value={major.majorId}>
                  {major.name}
                </option>
              ))}
            </select>
          </Field>

          {selectedMajor ? (
            <div className="rounded-xl bg-muted/50 p-4">
              <div className="text-xs font-bold uppercase tracking-widest text-primary">
                {selectedMajor.category}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {selectedMajor.description}
              </p>
            </div>
          ) : null}
        </section>

        <section className="space-y-4">
          <div>
            <h3 className="font-display text-lg font-bold">Trọng số môn học</h3>
            <p className="text-sm text-muted-foreground">Giá trị từ 0 đến 1.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ADVISOR_SUBJECT_WEIGHT_FIELDS.map((field) => (
              <Field key={field.key} label={field.label}>
                <NumberInput
                  min={0}
                  max={1}
                  step={0.05}
                  value={weights[field.key]}
                  onChange={(event) => updateWeight(field.key, event.target.value)}
                  className={inputClassName}
                />
              </Field>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="font-display text-lg font-bold">Trọng số tiêu chí</h3>
              <p className="text-sm text-muted-foreground">Tổng hiện tại: {scoreWeightTotal.toFixed(2)}</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {ADVISOR_SCORE_WEIGHT_FIELDS.map((field) => (
              <Field key={field.key} label={field.label}>
                <NumberInput
                  min={0}
                  max={1}
                  step={0.05}
                  value={weights[field.key]}
                  onChange={(event) => updateWeight(field.key, event.target.value)}
                  className={inputClassName}
                />
              </Field>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="font-display text-lg font-bold">Thông tin đóng góp</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Tên">
              <input
                value={contributorName}
                onChange={(event) => setContributorName(event.target.value)}
                className="h-11 w-full rounded-xl border-2 border-border bg-background px-4 text-sm outline-none transition-colors focus:border-primary"
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={contributorEmail}
                onChange={(event) => setContributorEmail(event.target.value)}
                className="h-11 w-full rounded-xl border-2 border-border bg-background px-4 text-sm outline-none transition-colors focus:border-primary"
              />
            </Field>
          </div>
          <Field label="Lý do đề xuất">
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={4}
              className="w-full rounded-xl border-2 border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-primary"
            />
          </Field>
        </section>

        {submitState === "success" ? (
          <div className="flex items-center gap-2 rounded-xl bg-tier-high-soft px-4 py-3 text-sm font-semibold text-tier-high">
            <CheckCircle2 className="h-4 w-4" />
            Đã lưu đóng góp.
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-xl bg-tier-low-soft px-4 py-3 text-sm font-semibold text-tier-low">
            {errorMessage}
          </div>
        ) : null}

        <div className="flex justify-end">
          <Button type="submit" variant="hero" disabled={submitState === "submitting"}>
            {submitState === "submitting" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Đang lưu
              </>
            ) : (
              <>
                <Send className="h-4 w-4" /> Gửi đóng góp
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
