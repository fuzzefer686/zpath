type FollowUpSuggestionsProps = {
  questions: string[];
  onSelect?: (question: string) => void;
};

export function FollowUpSuggestions({
  questions,
  onSelect,
}: FollowUpSuggestionsProps) {
  if (!questions.length) return null;

  return (
    <div>
      <h3 className="font-display text-base font-bold">Câu hỏi tiếp theo</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {questions.map((question) => (
          <button
            key={question}
            type="button"
            onClick={() => onSelect?.(question)}
            className="rounded-md border border-border bg-card px-3 py-2 text-left text-xs font-semibold leading-5 transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  );
}
