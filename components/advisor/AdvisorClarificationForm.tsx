"use client";

import { useMemo, useState, type FormEvent } from "react";
import { ClipboardList, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type {
  AdvisorClarification,
  AdvisorClarificationAnswer,
} from "@/lib/advisor/types";

type AdvisorClarificationFormProps = {
  clarification: AdvisorClarification;
  disabled?: boolean;
  submitted?: boolean;
  onSubmit: (answers: AdvisorClarificationAnswer[]) => void;
};

export function AdvisorClarificationForm({
  clarification,
  disabled = false,
  submitted = false,
  onSubmit,
}: AdvisorClarificationFormProps) {
  const initialValues = useMemo(
    () =>
      Object.fromEntries(
        clarification.questions.map((question) => [question.id, ""]),
      ) as Record<string, string>,
    [clarification.questions],
  );
  const [values, setValues] = useState(initialValues);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (disabled || submitted) return;

    const answers = clarification.questions
      .map((question) => ({
        id: question.id,
        value: values[question.id]?.trim() ?? "",
      }))
      .filter((answer) => answer.value);

    const missingRequired = clarification.questions.some(
      (question) => question.required && !values[question.id]?.trim(),
    );

    if (missingRequired) {
      setError("Hãy trả lời các câu bắt buộc để ZPath tư vấn sát hơn.");
      return;
    }

    setError(null);
    onSubmit(answers);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full rounded-2xl border border-white/30 bg-white/70 p-4 text-left shadow-sm backdrop-blur-md"
    >
      <div className="mb-4 flex gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ClipboardList className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-black text-foreground">
            ZPath cần vài thông tin nhanh
          </h3>
          <p className="mt-1 text-xs font-medium leading-5 text-muted-foreground">
            Trả lời ngắn để AI tư vấn ngành phù hợp hơn.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {clarification.questions.map((question) => (
          <label key={question.id} className="block text-xs font-bold text-foreground">
            {question.label}
            {question.required ? <span className="text-destructive"> *</span> : null}
            <input
              value={values[question.id] ?? ""}
              onChange={(event) =>
                setValues((currentValues) => ({
                  ...currentValues,
                  [question.id]: event.target.value.slice(0, 120),
                }))
              }
              maxLength={120}
              placeholder={question.placeholder}
              disabled={disabled || submitted}
              className="mt-1.5 h-10 w-full rounded-xl border border-white/40 bg-white/85 px-3 text-sm font-semibold text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary"
            />
          </label>
        ))}
      </div>

      {error ? (
        <div className="mt-3 rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs font-bold text-destructive">
          {error}
        </div>
      ) : null}

      <Button
        type="submit"
        variant="hero"
        className="mt-4 w-full rounded-xl"
        disabled={disabled || submitted}
      >
        {disabled && !submitted ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {submitted ? "Đã gửi câu trả lời" : "Gửi câu trả lời nhanh"}
      </Button>
    </form>
  );
}
