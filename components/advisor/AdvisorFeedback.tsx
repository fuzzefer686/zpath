"use client";

import { useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";

import { Button } from "@/components/ui/button";

type AdvisorFeedbackProps = {
  messageId?: string | null;
};

type FeedbackRating = "up" | "down";

const downvoteReasons = [
  "Thông tin sai",
  "Thiếu nguồn",
  "Trả lời chưa đúng ý",
  "Khác",
];

export function AdvisorFeedback({ messageId }: AdvisorFeedbackProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReasons, setShowReasons] = useState(false);
  const [submittedRating, setSubmittedRating] =
    useState<FeedbackRating | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!messageId) return null;

  const submitFeedback = async (rating: FeedbackRating, comment?: string) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/advisor/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messageId,
          rating,
          comment,
        }),
      });

      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        throw new Error(result?.error?.message ?? "Không thể lưu phản hồi.");
      }

      setSubmittedRating(rating);
      setShowReasons(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Không thể lưu phản hồi.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-md border bg-muted/30 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold">Câu trả lời này hữu ích không?</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Phản hồi giúp ZPath cải thiện chất lượng tư vấn.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={submittedRating === "up" ? "secondary" : "outline"}
            size="sm"
            className="rounded-md"
            disabled={isSubmitting}
            onClick={() => void submitFeedback("up")}
          >
            <ThumbsUp className="h-4 w-4" />
            Hữu ích
          </Button>
          <Button
            type="button"
            variant={submittedRating === "down" ? "secondary" : "outline"}
            size="sm"
            className="rounded-md"
            disabled={isSubmitting}
            onClick={() => {
              setShowReasons(true);
              setErrorMessage(null);
            }}
          >
            <ThumbsDown className="h-4 w-4" />
            Chưa ổn
          </Button>
        </div>
      </div>

      {showReasons && (
        <div className="mt-4 border-t pt-4">
          <p className="text-xs font-semibold text-muted-foreground">
            Có thể chọn lý do hoặc gửi phản hồi không kèm lý do.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {downvoteReasons.map((reason) => (
              <button
                key={reason}
                type="button"
                className="rounded-md border bg-background px-3 py-2 text-xs font-semibold transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
                disabled={isSubmitting}
                onClick={() => void submitFeedback("down", reason)}
              >
                {reason}
              </button>
            ))}
            <button
              type="button"
              className="rounded-md border bg-background px-3 py-2 text-xs font-semibold transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
              disabled={isSubmitting}
              onClick={() => void submitFeedback("down")}
            >
              Gửi không kèm lý do
            </button>
          </div>
        </div>
      )}

      {submittedRating && (
        <p className="mt-3 text-xs font-semibold text-primary">
          Cảm ơn bạn đã phản hồi.
        </p>
      )}

      {errorMessage && (
        <p className="mt-3 text-xs font-semibold text-destructive">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
