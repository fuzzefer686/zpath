"use client";

import { useCallback, useMemo, useState } from "react";

import type {
  GenericMethodConfig,
  GenericSubjectCombination,
} from "@/src/lib/admission-engine/generic";

export type CombinationFormState = {
  combinationCode: string;
  subjectScores: Record<string, string>;
};

export function useGenericCombinationForm(method: GenericMethodConfig | null) {
  const combinations = useMemo(() => {
    if (!method) return [];
    const subjectGroup = method.inputs.find((input) => input.type === "subject_group");
    return (
      method.combinations ??
      subjectGroup?.combinations ??
      []
    );
  }, [method]);

  const [combinationCode, setCombinationCode] = useState(
    combinations[0]?.code ?? "",
  );
  const [subjectScores, setSubjectScores] = useState<Record<string, string>>({});

  const selectedCombination = useMemo(
    () => combinations.find((combo) => combo.code === combinationCode) ?? null,
    [combinations, combinationCode],
  );

  const selectCombination = useCallback(
    (code: string) => {
      setCombinationCode(code);
      const combo = combinations.find((item) => item.code === code);
      if (!combo) {
        setSubjectScores({});
        return;
      }
      const nextScores: Record<string, string> = {};
      for (const subject of combo.subjects) {
        nextScores[subject.key] = subjectScores[subject.key] ?? "";
      }
      setSubjectScores(nextScores);
    },
    [combinations, subjectScores],
  );

  const updateSubjectScore = useCallback((key: string, value: string) => {
    setSubjectScores((current) => ({ ...current, [key]: value }));
  }, []);

  const buildSubjectGroupPayload = useCallback((): Record<string, number> => {
    const payload: Record<string, number> = {};
    if (!selectedCombination) return payload;

    for (const subject of selectedCombination.subjects) {
      const raw = subjectScores[subject.key]?.trim();
      if (!raw) continue;
      const score = Number(raw);
      if (Number.isFinite(score)) {
        payload[subject.key] = score;
      }
    }
    return payload;
  }, [selectedCombination, subjectScores]);

  const resetCombinationForm = useCallback(() => {
    setCombinationCode(combinations[0]?.code ?? "");
    setSubjectScores({});
  }, [combinations]);

  return {
    combinations,
    combinationCode,
    selectedCombination,
    subjectScores,
    selectCombination,
    updateSubjectScore,
    buildSubjectGroupPayload,
    resetCombinationForm,
  };
}

export type { GenericSubjectCombination };
