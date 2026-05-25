import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  ProgramCombination,
  SubjectCombination,
} from "@/src/types/admission-data";

type SubjectCombinationsSectionProps = {
  subjectCombinations: SubjectCombination[];
  programCombinations: ProgramCombination[];
};

export function SubjectCombinationsSection({
  subjectCombinations,
  programCombinations,
}: SubjectCombinationsSectionProps) {
  const usedCodes = new Set(
    programCombinations.map((combination) => combination.combination_code),
  );
  const visibleCombinations = usedCodes.size
    ? subjectCombinations.filter((combination) => usedCodes.has(combination.code))
    : subjectCombinations;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Tổ hợp xét tuyển</CardTitle>
      </CardHeader>
      <CardContent>
        {visibleCombinations.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có dữ liệu tổ hợp.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visibleCombinations.map((combination) => (
              <div key={combination.id} className="rounded-lg border border-border p-4">
                <div className="font-display text-lg font-bold text-primary">
                  {combination.code}
                </div>
                <p className="mt-2 text-sm">{combination.subjects.join(" + ")}</p>
                {combination.description ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {combination.description}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
