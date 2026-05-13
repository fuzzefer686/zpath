"use client";

import { useState } from "react";
import {
  Brain,
  GraduationCap,
  Heart,
  Loader2,
  Sparkles,
  Target,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, NumberInput } from "@/components/zpath/FormFields";
import { SbtiPicker } from "@/components/zpath/SbtiPicker";
import {
  ADVISOR_SUBJECT_OPTIONS,
  INTEREST_OPTIONS,
  CAREER_GOAL_OPTIONS,
  type AdvisorSubject,
  type AdvisorUserProfile,
  type RecommendationResult,
} from "@/lib/advisor-types";
import type { SbtiType } from "@/types/zpath";

// ── Multi-select Chip Picker ────────────────────────────────────────────────

function ChipPicker({
  options,
  selected,
  onChange,
}: {
  options: readonly string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (option: string) => {
    onChange(
      selected.includes(option)
        ? selected.filter((s) => s !== option)
        : [...selected, option]
    );
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = selected.includes(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() => toggle(option)}
            className={`rounded-full border-2 px-4 py-2 text-sm font-semibold transition-all ${
              active
                ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "border-border bg-card text-foreground/70 hover:border-primary/40 hover:bg-primary/5"
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

// ── Form state ──────────────────────────────────────────────────────────────

interface AdvisorFormData {
  math: number;
  literature: number;
  electiveSubject1: AdvisorSubject | "";
  electiveScore1: number;
  electiveSubject2: AdvisorSubject | "";
  electiveScore2: number;
  ielts: number;
  personality: SbtiType | "";
  interests: string[];
  careerGoals: string[];
}

const initial: AdvisorFormData = {
  math: 0,
  literature: 0,
  electiveSubject1: "",
  electiveScore1: 0,
  electiveSubject2: "",
  electiveScore2: 0,
  ielts: 0,
  personality: "",
  interests: [],
  careerGoals: [],
};

// ── Main component ──────────────────────────────────────────────────────────

export function AdvisorForm({
  onResult,
}: {
  onResult: (results: RecommendationResult[]) => void;
}) {
  const [data, setData] = useState<AdvisorFormData>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof AdvisorFormData, string>>>({});
  const [loading, setLoading] = useState(false);

  const update = <K extends keyof AdvisorFormData>(key: K, value: AdvisorFormData[K]) =>
    setData((prev) => ({ ...prev, [key]: value }));

  const validate = (): boolean => {
    const next: typeof errors = {};

    const checkScore = (score: number, key: keyof AdvisorFormData, label: string) => {
      if (Number.isNaN(score) || score < 0 || score > 10) {
        next[key] = `${label} phải từ 0 đến 10`;
      }
    };

    checkScore(data.math, "math", "Điểm Toán");
    checkScore(data.literature, "literature", "Điểm Văn");
    checkScore(data.electiveScore1, "electiveScore1", "Điểm môn tự chọn 1");
    checkScore(data.electiveScore2, "electiveScore2", "Điểm môn tự chọn 2");

    if (!data.electiveSubject1) {
      next.electiveSubject1 = "Vui lòng chọn môn tự chọn 1";
    }

    if (!data.electiveSubject2) {
      next.electiveSubject2 = "Vui lòng chọn môn tự chọn 2";
    }

    if (
      data.electiveSubject1 &&
      data.electiveSubject2 &&
      data.electiveSubject1 === data.electiveSubject2
    ) {
      next.electiveSubject2 = "Hai môn tự chọn phải khác nhau";
    }

    if (data.ielts < 0 || data.ielts > 9) {
      next.ielts = "IELTS từ 0 đến 9";
    }

    if (data.interests.length === 0) {
      next.interests = "Vui lòng chọn ít nhất 1 sở thích";
    }

    if (data.careerGoals.length === 0) {
      next.careerGoals = "Vui lòng chọn ít nhất 1 mục tiêu";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);

    try {
      const payload: AdvisorUserProfile = {
        math: data.math,
        literature: data.literature,
        electives: [
          { subject: data.electiveSubject1 as AdvisorSubject, score: data.electiveScore1 },
          { subject: data.electiveSubject2 as AdvisorSubject, score: data.electiveScore2 },
        ],
        ielts: data.ielts || null,
        personality: data.personality || null,
        interests: data.interests.map((s) => s.toLowerCase()),
        careerGoals: data.careerGoals.map((s) => s.toLowerCase()),
      };

      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("API error");

      const json = await res.json();
      console.log("Advisor API response:", json);
      onResult(json.recommendations);
    } catch (err) {
      console.error("Advisor form error:", err);
      setErrors({ math: "Đã xảy ra lỗi. Vui lòng thử lại." });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setData(initial);
    setErrors({});
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-3xl border-2 border-border bg-card p-6 shadow-md sm:p-8">
      <div className="space-y-8">
        {/* ── Section 1: Tính cách ─────────────────────────── */}
        <section>
          <SectionHeader icon={Brain} label="1" title="Tính cách MBTI/SBTI" color="primary" />
          <p className="mb-3 text-sm text-muted-foreground">Không bắt buộc — hệ thống vẫn cho kết quả nếu bỏ qua.</p>
          <SbtiPicker
            value={data.personality}
            onChange={(v) => update("personality", v)}
          />
        </section>

        {/* ── Section 2: Điểm số ──────────────────────────── */}
        <section>
          <SectionHeader icon={GraduationCap} label="2" title="Điểm 4 môn thi" color="accent" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Toán" error={errors.math}>
              <NumberInput
                min={0} max={10} step={0.25} placeholder="0 - 10"
                value={data.math || ""}
                onChange={(e) => update("math", parseFloat(e.target.value) || 0)}
              />
            </Field>
            <Field label="Văn" error={errors.literature}>
              <NumberInput
                min={0} max={10} step={0.25} placeholder="0 - 10"
                value={data.literature || ""}
                onChange={(e) => update("literature", parseFloat(e.target.value) || 0)}
              />
            </Field>
            <Field label="Môn tự chọn 1" error={errors.electiveSubject1}>
              <select
                value={data.electiveSubject1}
                onChange={(e) => update("electiveSubject1", e.target.value as AdvisorSubject | "")}
                className="h-11 w-full rounded-xl border-2 border-border bg-background px-3 text-sm font-medium outline-none transition-colors focus:border-primary"
              >
                <option value="">Chọn môn</option>
                {ADVISOR_SUBJECT_OPTIONS.map((subject) => (
                  <option key={subject.value} value={subject.value}>
                    {subject.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Điểm môn tự chọn 1" error={errors.electiveScore1}>
              <NumberInput
                min={0} max={10} step={0.25} placeholder="0 - 10"
                value={data.electiveScore1 || ""}
                onChange={(e) => update("electiveScore1", parseFloat(e.target.value) || 0)}
              />
            </Field>
            <Field label="Môn tự chọn 2" error={errors.electiveSubject2}>
              <select
                value={data.electiveSubject2}
                onChange={(e) => update("electiveSubject2", e.target.value as AdvisorSubject | "")}
                className="h-11 w-full rounded-xl border-2 border-border bg-background px-3 text-sm font-medium outline-none transition-colors focus:border-primary"
              >
                <option value="">Chọn môn</option>
                {ADVISOR_SUBJECT_OPTIONS.map((subject) => (
                  <option key={subject.value} value={subject.value}>
                    {subject.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Điểm môn tự chọn 2" error={errors.electiveScore2}>
              <NumberInput
                min={0} max={10} step={0.25} placeholder="0 - 10"
                value={data.electiveScore2 || ""}
                onChange={(e) => update("electiveScore2", parseFloat(e.target.value) || 0)}
              />
            </Field>
          </div>
          <div className="mt-4 max-w-[200px]">
            <Field label="IELTS (band)" hint="Để 0 nếu chưa có" error={errors.ielts}>
              <NumberInput
                min={0} max={9} step={0.5} placeholder="0 - 9"
                value={data.ielts || ""}
                onChange={(e) => update("ielts", parseFloat(e.target.value) || 0)}
              />
            </Field>
          </div>
        </section>

        {/* ── Section 3: Sở thích ─────────────────────────── */}
        <section>
          <SectionHeader icon={Heart} label="3" title="Sở thích của bạn" color="secondary" />
          <p className="mb-3 text-sm text-muted-foreground">Chọn những lĩnh vực bạn quan tâm nhất.</p>
          <ChipPicker
            options={INTEREST_OPTIONS}
            selected={data.interests}
            onChange={(v) => update("interests", v)}
          />
          {errors.interests && (
            <p className="mt-2 text-xs font-medium text-destructive">{errors.interests}</p>
          )}
        </section>

        {/* ── Section 4: Mục tiêu nghề nghiệp ────────────── */}
        <section>
          <SectionHeader icon={Target} label="4" title="Mục tiêu nghề nghiệp" color="tier-high" />
          <p className="mb-3 text-sm text-muted-foreground">Bạn mong muốn điều gì ở công việc tương lai?</p>
          <ChipPicker
            options={CAREER_GOAL_OPTIONS}
            selected={data.careerGoals}
            onChange={(v) => update("careerGoals", v)}
          />
          {errors.careerGoals && (
            <p className="mt-2 text-xs font-medium text-destructive">{errors.careerGoals}</p>
          )}
        </section>

        {/* ── Actions ─────────────────────────────────────── */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button type="button" variant="ghost" onClick={reset} disabled={loading}>
            Đặt lại
          </Button>
          <Button type="submit" variant="hero" size="lg" disabled={loading} className="w-full sm:w-auto">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Đang phân tích...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Tìm ngành phù hợp
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}

// ── Section header helper ───────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  label,
  title,
  color,
}: {
  icon: typeof Brain;
  label: string;
  title: string;
  color: string;
}) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <span className={`flex h-8 w-8 items-center justify-center rounded-lg bg-${color}/10 text-${color}`}>
        <Icon className="h-4 w-4" />
      </span>
      <h3 className="font-display text-lg font-bold">
        {label}. {title}
      </h3>
    </div>
  );
}
