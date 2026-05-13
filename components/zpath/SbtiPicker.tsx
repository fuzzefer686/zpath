"use client";

import { useState } from "react";
import { ArrowRight, Brain, RotateCcw, Sparkles } from "lucide-react";

import { SBTI_TYPES, type SbtiType } from "@/types/zpath";
import {
  getPersonalityLabel,
  PERSONALITY_DESCRIPTIONS,
  PERSONALITY_TEST_URL,
} from "@/lib/personality-descriptions";

const QUESTIONS: { q: string; axis: "EI" | "SN" | "TF" | "JP"; a: [string, string] }[] = [
  { q: "Cuối tuần lý tưởng của bạn?", axis: "EI", a: ["Đi chơi với hội bạn", "Ở nhà thư giãn một mình"] },
  { q: "Khi học bài, bạn thiên về?", axis: "SN", a: ["Ghi chú chi tiết, từng bước", "Hiểu bức tranh tổng thể, ý tưởng"] },
  { q: "Khi quyết định, bạn dựa vào?", axis: "TF", a: ["Logic và lý lẽ", "Cảm xúc và giá trị cá nhân"] },
  { q: "Lịch học của bạn thường?", axis: "JP", a: ["Có kế hoạch rõ ràng", "Linh hoạt, tùy hứng"] },
];

interface MiniSbtiProps {
  onComplete: (type: SbtiType) => void;
}

function MiniSbtiTest({ onComplete }: MiniSbtiProps) {
  const [step, setStep] = useState(0);
  const [scores, setScores] = useState({ E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 });

  const handle = (choice: 0 | 1) => {
    const axis = QUESTIONS[step].axis;
    const map: Record<typeof axis, [keyof typeof scores, keyof typeof scores]> = {
      EI: ["E", "I"],
      SN: ["S", "N"],
      TF: ["T", "F"],
      JP: ["J", "P"],
    };
    const key = map[axis][choice];
    const next = { ...scores, [key]: scores[key] + 1 };
    setScores(next);

    if (step + 1 >= QUESTIONS.length) {
      const type =
        `${next.E >= next.I ? "E" : "I"}${next.S >= next.N ? "S" : "N"}${next.T >= next.F ? "T" : "F"}${next.J >= next.P ? "J" : "P"}` as SbtiType;
      onComplete(type);
    } else {
      setStep(step + 1);
    }
  };

  const question = QUESTIONS[step];
  const progress = (step / QUESTIONS.length) * 100;

  return (
    <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-5">
      <div className="mb-4 flex items-center justify-between text-xs font-bold text-primary">
        <span className="inline-flex items-center gap-1.5">
          <Brain className="h-3.5 w-3.5" /> Câu {step + 1}/{QUESTIONS.length}
        </span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-primary/10">
        <div className="h-full bg-gradient-primary transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>
      <p className="mb-4 text-base font-semibold">{question.q}</p>
      <div className="grid gap-2.5">
        {question.a.map((option, index) => (
          <button
            key={option}
            type="button"
            onClick={() => handle(index as 0 | 1)}
            className="group flex items-center justify-between rounded-xl border-2 border-border bg-card px-4 py-3.5 text-left text-sm font-medium transition-all hover:border-primary hover:bg-primary/5"
          >
            <span>{option}</span>
            <ArrowRight className="h-4 w-4 opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100" />
          </button>
        ))}
      </div>
    </div>
  );
}

interface SbtiPickerProps {
  value: SbtiType | "";
  onChange: (value: SbtiType) => void;
}

export function SbtiPicker({ value, onChange }: SbtiPickerProps) {
  const [mode, setMode] = useState<"choose" | "known" | "test">("choose");

  if (mode === "choose") {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setMode("known")}
          className="group rounded-2xl border-2 border-border bg-card p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
        >
          <Sparkles className="h-6 w-6 text-primary" />
          <div className="mt-3 font-display font-bold">Đã biết kết quả</div>
          <p className="mt-1 text-xs text-muted-foreground">Chọn nhanh từ 16 loại tính cách</p>
        </button>
        <button
          type="button"
          onClick={() => setMode("test")}
          className="group rounded-2xl border-2 border-border bg-card p-5 text-left transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-md"
        >
          <Brain className="h-6 w-6 text-accent" />
          <div className="mt-3 font-display font-bold">Làm test nhanh</div>
          <p className="mt-1 text-xs text-muted-foreground">4 câu hỏi trong khoảng 30 giây</p>
        </button>
        <div className="rounded-2xl border-2 border-border bg-muted/40 p-5 text-sm text-muted-foreground sm:col-span-2">
          Nếu chưa biết kết quả MBTI, bạn có thể làm bài test nhanh tại{" "}
          <a
            href={PERSONALITY_TEST_URL}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            16Personalities
          </a>
          .
        </div>
      </div>
    );
  }

  if (mode === "test") {
    return (
      <div>
        <MiniSbtiTest
          onComplete={(type) => {
            onChange(type);
            setMode("known");
          }}
        />
        <button
          type="button"
          onClick={() => setMode("choose")}
          className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="h-3 w-3" /> Chọn cách khác
        </button>
      </div>
    );
  }

  return (
    <div>
      {value && (
        <div className="mb-3 rounded-xl bg-gradient-primary px-4 py-3 text-primary-foreground">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            <span className="font-display font-bold">
              Bạn là: {getPersonalityLabel(value)}
            </span>
          </div>
          <p className="mt-1 pl-7 text-xs text-primary-foreground/85">
            {PERSONALITY_DESCRIPTIONS[value].summary}
          </p>
        </div>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        {SBTI_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => onChange(type)}
            className={`rounded-xl border-2 px-3 py-2.5 text-left transition-all ${
              value === type
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:border-primary/40"
            }`}
          >
            <span className="block text-sm font-bold">{getPersonalityLabel(type)}</span>
            <span
              className={`mt-1 block text-xs ${
                value === type ? "text-primary-foreground/80" : "text-muted-foreground"
              }`}
            >
              {PERSONALITY_DESCRIPTIONS[type].summary}
            </span>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setMode("choose")}
        className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <RotateCcw className="h-3 w-3" /> Chọn cách khác
      </button>
    </div>
  );
}
