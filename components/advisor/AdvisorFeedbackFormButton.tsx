import { ExternalLink } from "lucide-react";

const feedbackFormUrl =
  process.env.NEXT_PUBLIC_ADVISOR_FEEDBACK_FORM_URL?.trim();

export function AdvisorFeedbackFormButton() {
  if (!feedbackFormUrl) {
    if (process.env.NODE_ENV === "production") return null;

    return (
      <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary">
        Chua cau hinh NEXT_PUBLIC_ADVISOR_FEEDBACK_FORM_URL.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/25 bg-white/55 p-3 shadow-sm backdrop-blur-xl">
      <a
        href={feedbackFormUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-center text-sm font-bold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        Hãy cùng nhau cải tiến ZPath
        <ExternalLink className="h-4 w-4" />
      </a>
    </div>
  );
}
