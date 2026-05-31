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
    <div className="space-y-2.5 mt-4">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gợi ý câu hỏi tiếp theo</h4>
      <div className="flex flex-wrap gap-2">
        {questions.map((question) => (
          <button
            key={question}
            type="button"
            onClick={() => onSelect?.(question)}
            className="rounded-full bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold px-4 py-2 transition-colors text-left"
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  );
}
