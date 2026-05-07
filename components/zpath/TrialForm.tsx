"use client";

import { useState } from "react";
import {
  AlertCircle,
  Calculator,
  GraduationCap,
  Inbox,
  Loader2,
  MapPin,
  Sparkles,
  Trophy,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, NumberInput, SelectInput } from "@/components/zpath/FormFields";
import { SbtiPicker } from "@/components/zpath/SbtiPicker";
import { tierConfig } from "@/components/zpath/TierBadge";
import { computeResult } from "@/lib/zpath-calc";
import { REGIONS, SUBJECTS, type TrialFormData, type TrialResult } from "@/types/zpath";

const initial: TrialFormData = {
  sbti: "",
  scoreMath: 0,
  scoreLiterature: 0,
  electiveSubject1: "",
  electiveScore1: 0,
  electiveSubject2: "",
  electiveScore2: 0,
  ielts: 0,
  culturalAward: "none",
  region: "",
};

type Status = "idle" | "loading" | "error" | "success";

export function TrialForm() {
  const [data, setData] = useState<TrialFormData>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof TrialFormData, string>>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<TrialResult | null>(null);

  const update = <K extends keyof TrialFormData>(key: K, value: TrialFormData[K]) =>
    setData((current) => ({ ...current, [key]: value }));

  const validate = (): boolean => {
    const nextErrors: typeof errors = {};

    if (!data.sbti) nextErrors.sbti = "Vui lòng chọn loại tính cách SBTI";
    if (!data.region) nextErrors.region = "Vui lòng chọn vùng";
    if (!data.electiveSubject1) nextErrors.electiveSubject1 = "Chọn môn tự chọn 1";
    if (!data.electiveSubject2) nextErrors.electiveSubject2 = "Chọn môn tự chọn 2";
    if (data.electiveSubject1 && data.electiveSubject1 === data.electiveSubject2) {
      nextErrors.electiveSubject2 = "Hai môn tự chọn phải khác nhau";
    }

    const checkScore = (score: number, key: keyof TrialFormData) => {
      if (Number.isNaN(score) || score < 0 || score > 10) {
        nextErrors[key] = "Điểm phải từ 0 đến 10";
      }
    };

    checkScore(data.scoreMath, "scoreMath");
    checkScore(data.scoreLiterature, "scoreLiterature");
    checkScore(data.electiveScore1, "electiveScore1");
    checkScore(data.electiveScore2, "electiveScore2");

    if (data.ielts < 0 || data.ielts > 9) {
      nextErrors.ielts = "IELTS từ 0 đến 9";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;

    setStatus("loading");
    setResult(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 700));
      setResult(computeResult(data));
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  const reset = () => {
    setData(initial);
    setErrors({});
    setStatus("idle");
    setResult(null);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <form onSubmit={handleSubmit} className="rounded-3xl border-2 border-border bg-card p-6 shadow-md sm:p-8">
        <div className="space-y-7">
          <section>
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Sparkles className="h-4 w-4" />
              </span>
              <h3 className="font-display text-lg font-bold">1. Tính cách SBTI</h3>
            </div>
            <SbtiPicker value={data.sbti} onChange={(value) => update("sbti", value)} />
            {errors.sbti && <p className="mt-2 text-xs font-medium text-destructive">{errors.sbti}</p>}
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <GraduationCap className="h-4 w-4" />
              </span>
              <h3 className="font-display text-lg font-bold">2. Điểm thi khảo sát gần nhất</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Toán" error={errors.scoreMath}>
                <NumberInput
                  min={0}
                  max={10}
                  step={0.25}
                  placeholder="0 - 10"
                  value={data.scoreMath || ""}
                  onChange={(event) => update("scoreMath", parseFloat(event.target.value) || 0)}
                />
              </Field>
              <Field label="Văn" error={errors.scoreLiterature}>
                <NumberInput
                  min={0}
                  max={10}
                  step={0.25}
                  placeholder="0 - 10"
                  value={data.scoreLiterature || ""}
                  onChange={(event) => update("scoreLiterature", parseFloat(event.target.value) || 0)}
                />
              </Field>
              <Field label="Môn tự chọn 1" error={errors.electiveSubject1}>
                <SelectInput
                  value={data.electiveSubject1}
                  onChange={(event) =>
                    update("electiveSubject1", event.target.value as TrialFormData["electiveSubject1"])
                  }
                >
                  <option value="">Chọn môn</option>
                  {SUBJECTS.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Điểm môn 1" error={errors.electiveScore1}>
                <NumberInput
                  min={0}
                  max={10}
                  step={0.25}
                  placeholder="0 - 10"
                  value={data.electiveScore1 || ""}
                  onChange={(event) => update("electiveScore1", parseFloat(event.target.value) || 0)}
                />
              </Field>
              <Field label="Môn tự chọn 2" error={errors.electiveSubject2}>
                <SelectInput
                  value={data.electiveSubject2}
                  onChange={(event) =>
                    update("electiveSubject2", event.target.value as TrialFormData["electiveSubject2"])
                  }
                >
                  <option value="">Chọn môn</option>
                  {SUBJECTS.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Điểm môn 2" error={errors.electiveScore2}>
                <NumberInput
                  min={0}
                  max={10}
                  step={0.25}
                  placeholder="0 - 10"
                  value={data.electiveScore2 || ""}
                  onChange={(event) => update("electiveScore2", parseFloat(event.target.value) || 0)}
                />
              </Field>
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/30 text-foreground">
                <Trophy className="h-4 w-4" />
              </span>
              <h3 className="font-display text-lg font-bold">3. Điểm thưởng</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="IELTS (band)" hint="Để 0 nếu chưa có" error={errors.ielts}>
                <NumberInput
                  min={0}
                  max={9}
                  step={0.5}
                  placeholder="0 - 9"
                  value={data.ielts || ""}
                  onChange={(event) => update("ielts", parseFloat(event.target.value) || 0)}
                />
              </Field>
              <Field label="Giải văn hóa cao nhất">
                <SelectInput
                  value={data.culturalAward}
                  onChange={(event) =>
                    update("culturalAward", event.target.value as TrialFormData["culturalAward"])
                  }
                >
                  <option value="none">Không có</option>
                  <option value="encouragement">Khuyến khích</option>
                  <option value="third">Giải Ba</option>
                  <option value="second">Giải Nhì</option>
                  <option value="first">Giải Nhất</option>
                </SelectInput>
              </Field>
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-tier-high/10 text-tier-high">
                <MapPin className="h-4 w-4" />
              </span>
              <h3 className="font-display text-lg font-bold">4. Vùng dự thi</h3>
            </div>
            <Field label="Tỉnh / Thành phố" error={errors.region}>
              <SelectInput value={data.region} onChange={(event) => update("region", event.target.value)}>
                <option value="">Chọn vùng</option>
                {REGIONS.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </SelectInput>
            </Field>
          </section>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="ghost" onClick={reset} disabled={status === "loading"}>
              Đặt lại
            </Button>
            <Button type="submit" variant="hero" size="lg" disabled={status === "loading"} className="w-full sm:w-auto">
              {status === "loading" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Đang tính toán...
                </>
              ) : (
                <>
                  <Calculator className="h-4 w-4" /> Tính tỉ lệ đỗ
                </>
              )}
            </Button>
          </div>
        </div>
      </form>

      <ResultPanel status={status} result={result} onRetry={() => setStatus("idle")} />
    </div>
  );
}

function ResultPanel({
  status,
  result,
  onRetry,
}: {
  status: Status;
  result: TrialResult | null;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-3xl bg-foreground p-6 text-background shadow-glow sm:p-8 lg:sticky lg:top-24 lg:self-start">
      <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-background/10 px-3 py-1 text-xs font-bold uppercase tracking-widest">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-secondary" />
        Kết quả
      </div>
      <h3 className="font-display text-2xl font-bold">Tỉ lệ đỗ của bạn</h3>

      <div className="mt-6 min-h-[280px]">
        {status === "idle" && (
          <div className="flex h-full min-h-[260px] flex-col items-center justify-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-background/10">
              <Inbox className="h-8 w-8 text-background/60" />
            </div>
            <p className="mt-4 text-sm text-background/70">
              Điền thông tin bên trái rồi bấm{" "}
              <span className="font-bold text-secondary">Tính tỉ lệ đỗ</span> để xem kết quả.
            </p>
          </div>
        )}

        {status === "loading" && (
          <div className="flex h-full min-h-[260px] flex-col items-center justify-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-secondary" />
            <p className="text-sm text-background/70">Đang phân tích dữ liệu...</p>
            <div className="w-full space-y-2">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-3 animate-pulse rounded-full bg-background/10"
                  style={{ width: `${100 - item * 15}%` }}
                />
              ))}
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="flex h-full min-h-[260px] flex-col items-center justify-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/20">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <p className="text-sm text-background/80">Đã xảy ra lỗi khi tính toán. Vui lòng thử lại.</p>
            <Button variant="lime" size="sm" onClick={onRetry}>
              Thử lại
            </Button>
          </div>
        )}

        {status === "success" && result && (
          <div className="animate-fade-up space-y-5">
            <div
              className={`rounded-2xl p-5 ${
                result.tier === "HIGH"
                  ? "bg-tier-high text-tier-high-foreground"
                  : result.tier === "MID"
                    ? "bg-tier-mid text-tier-mid-foreground"
                    : "bg-tier-low text-tier-low-foreground"
              }`}
            >
              <div className="text-sm font-semibold opacity-90">{tierConfig[result.tier].sub}</div>
              <div className="mt-1 font-display text-5xl font-bold">{result.tier}</div>
              <div className="mt-3 text-sm opacity-95">{result.message}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-background/10 p-4">
                <div className="text-xs text-background/60">Tổng điểm</div>
                <div className="mt-1 font-display text-2xl font-bold">{result.totalScore.toFixed(2)}</div>
              </div>
              <div className="rounded-xl bg-background/10 p-4">
                <div className="text-xs text-background/60">Điểm thưởng</div>
                <div className="mt-1 font-display text-2xl font-bold">+{result.bonus.toFixed(1)}</div>
              </div>
            </div>
            <p className="text-xs text-background/50">
              * Đây là kết quả ước tính dựa trên thuật toán demo. Phiên bản đầy đủ sẽ tính theo dữ
              liệu thực tế từng vùng.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
