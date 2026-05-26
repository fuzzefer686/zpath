"use client";

import { useMemo } from "react";

import { Input } from "@/components/ui/input";
import {
  LANGUAGE_CERTIFICATE_TYPE_LABELS,
  convertLanguageCertificateToBand,
  convertToeicFourSkills,
  getLanguageCertificateInputMode,
  getLanguageCertificateLevelOptions,
  getLanguageCertificateScoreRange,
  getLanguageCertificateTypes,
  type LanguageCertificateConversionInput,
  type LanguageCertificateConversionResult,
  type LanguageCertificateType,
  type ToeicFourSkillsConversionResult,
  type ToeicFourSkillsInput,
  type ToeicSkillName,
} from "@/src/lib/admission-engine/schools/hust/language-certificates-2026";

export type CertificateConversionInputValue = {
  certificateType: LanguageCertificateType;
  score: string;
  levelValue: string;
  toeic: Record<ToeicSkillName, string>;
};

export type CertificateConversionStructuredValue = {
  input: LanguageCertificateConversionInput | {
    certificateType: "TOEIC";
    toeic: ToeicFourSkillsInput;
  };
  conversion: LanguageCertificateConversionResult | ToeicFourSkillsConversionResult;
} | null;

type CertificateConversionInputProps = {
  value: CertificateConversionInputValue;
  onChange: (
    value: CertificateConversionInputValue,
    structuredValue: CertificateConversionStructuredValue,
  ) => void;
};

const toeicSkillLabels: Record<ToeicSkillName, string> = {
  listening: "Nghe",
  speaking: "Nói",
  reading: "Đọc",
  writing: "Viết",
};

const emptyToeicScores: Record<ToeicSkillName, string> = {
  listening: "",
  speaking: "",
  reading: "",
  writing: "",
};

export function createDefaultCertificateConversionInputValue(): CertificateConversionInputValue {
  return {
    certificateType: "IELTS_ACADEMIC",
    score: "",
    levelValue: "",
    toeic: emptyToeicScores,
  };
}

function buildStructuredValue(
  inputValue: CertificateConversionInputValue,
): CertificateConversionStructuredValue {
  const inputMode = getLanguageCertificateInputMode(inputValue.certificateType);

  if (inputMode === "toeic") {
    const toeic: ToeicFourSkillsInput = {
      listening: parseOptionalScore(inputValue.toeic.listening),
      speaking: parseOptionalScore(inputValue.toeic.speaking),
      reading: parseOptionalScore(inputValue.toeic.reading),
      writing: parseOptionalScore(inputValue.toeic.writing),
    };
    const conversion = convertToeicFourSkills(toeic);

    return conversion
      ? {
          input: {
            certificateType: "TOEIC",
            toeic,
          },
          conversion,
        }
      : null;
  }

  const certificateInput: LanguageCertificateConversionInput = {
    certificateType: inputValue.certificateType,
    score: inputMode === "numeric" ? parseOptionalScore(inputValue.score) : undefined,
    bandId: inputMode === "level" ? inputValue.levelValue || undefined : undefined,
  };
  const conversion = convertLanguageCertificateToBand(certificateInput);

  return conversion
    ? {
        input: certificateInput,
        conversion,
      }
    : null;
}

function parseOptionalScore(value: string) {
  if (!value.trim()) return undefined;
  const score = Number(value);
  return Number.isFinite(score) ? score : undefined;
}

function hasAnyToeicScore(toeic: Record<ToeicSkillName, string>) {
  return Object.values(toeic).some((score) => score.trim());
}

function hasAllToeicScores(toeic: Record<ToeicSkillName, string>) {
  return Object.values(toeic).every((score) => score.trim());
}

function formatScore(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function CertificateConversionInput({
  value,
  onChange,
}: CertificateConversionInputProps) {
  const inputMode = getLanguageCertificateInputMode(value.certificateType);
  const levelOptions = getLanguageCertificateLevelOptions(value.certificateType);
  const scoreRange = getLanguageCertificateScoreRange(value.certificateType);

  const structuredValue = useMemo(() => buildStructuredValue(value), [value]);

  function emit(nextValue: CertificateConversionInputValue) {
    onChange(nextValue, buildStructuredValue(nextValue));
  }

  const showToeicMissingMessage =
    inputMode === "toeic" && hasAnyToeicScore(value.toeic) && !hasAllToeicScores(value.toeic);
  const hasUserInput =
    (inputMode === "numeric" && value.score.trim()) ||
    (inputMode === "level" && value.levelValue) ||
    (inputMode === "toeic" && hasAnyToeicScore(value.toeic));

  return (
    <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
      <div className="text-sm font-semibold">Chứng chỉ ngoại ngữ</div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-semibold">Loại chứng chỉ</span>
          <select
            value={value.certificateType}
            onChange={(event) => {
              const nextCertificateType = event.target.value as LanguageCertificateType;
              emit({
                certificateType: nextCertificateType,
                score: "",
                levelValue: "",
                toeic: emptyToeicScores,
              });
            }}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {getLanguageCertificateTypes().map((certificateType) => (
              <option key={certificateType} value={certificateType}>
                {LANGUAGE_CERTIFICATE_TYPE_LABELS[certificateType]}
              </option>
            ))}
          </select>
        </label>

        {inputMode === "numeric" ? (
          <label className="space-y-2">
            <span className="text-sm font-semibold">Điểm chứng chỉ</span>
            <Input
              type="number"
              min={scoreRange?.minScore}
              max={scoreRange?.maxScore}
              step="0.01"
              value={value.score}
              onChange={(event) => {
                emit({
                  ...value,
                  score: event.target.value,
                });
              }}
              placeholder={
                scoreRange
                  ? `${formatScore(scoreRange.minScore)} - ${formatScore(scoreRange.maxScore)}`
                  : "Điểm chứng chỉ"
              }
            />
          </label>
        ) : null}

        {inputMode === "level" ? (
          <label className="space-y-2">
            <span className="text-sm font-semibold">Điểm chứng chỉ</span>
            <select
              value={value.levelValue}
              onChange={(event) => {
                emit({
                  ...value,
                  levelValue: event.target.value,
                });
              }}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Chọn mức chứng chỉ</option>
              {levelOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {inputMode === "toeic" ? (
        <div className="grid gap-4 md:grid-cols-4">
          {(Object.keys(toeicSkillLabels) as ToeicSkillName[]).map((skillName) => (
            <label key={skillName} className="space-y-2">
              <span className="text-sm font-semibold">{toeicSkillLabels[skillName]}</span>
              <Input
                type="number"
                min="0"
                step="1"
                value={value.toeic[skillName]}
                onChange={(event) => {
                  emit({
                    ...value,
                    toeic: {
                      ...value.toeic,
                      [skillName]: event.target.value,
                    },
                  });
                }}
                placeholder="Điểm"
              />
            </label>
          ))}
        </div>
      ) : null}

      {structuredValue ? (
        <div className="grid gap-3 text-sm md:grid-cols-2">
          <div className="rounded-md border border-border bg-background p-3">
            <div className="text-xs font-semibold uppercase text-muted-foreground">
              Điểm thưởng
            </div>
            <div className="mt-1 font-semibold">
              {structuredValue.conversion.bonusScoreOutOf10.toFixed(2)}/10
            </div>
          </div>
          <div className="rounded-md border border-border bg-background p-3">
            <div className="text-xs font-semibold uppercase text-muted-foreground">
              Điểm quy đổi môn ngoại ngữ
            </div>
            <div className="mt-1 font-semibold">
              {structuredValue.conversion.convertedSubjectScoreOutOf10.toFixed(2)}/10
            </div>
          </div>
        </div>
      ) : null}

      {showToeicMissingMessage ? (
        <p className="text-sm font-medium text-destructive">
          TOEIC cần đủ điểm Nghe, Nói, Đọc, Viết để quy đổi
        </p>
      ) : null}

      {!structuredValue && hasUserInput && !showToeicMissingMessage ? (
        <p className="text-sm font-medium text-destructive">
          Không tìm thấy mức quy đổi phù hợp
        </p>
      ) : null}
    </div>
  );
}
