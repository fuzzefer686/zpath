import type { AdvisorInternalSource } from "@/lib/advisor/retrieval/types";

type AdvisorHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

type FtuIeltsConversionFact = {
  schoolCode: "FTU";
  schoolName: "Đại học Ngoại thương";
  certificate: "IELTS Academic";
  band: number | null;
  convertedScoreOutOf10: number | null;
  rules: Array<{
    condition: string;
    convertedScoreOutOf10: number;
  }>;
  note: string;
};

export type VerifiedAdvisorFactResult = {
  status: "success";
  data: FtuIeltsConversionFact;
  sources: AdvisorInternalSource[];
};

const FTU_IELTS_CONVERSION_SOURCE: AdvisorInternalSource = {
  sourceType: "zpath_database",
  title: "ZPath verified FTU IELTS conversion rule",
  url: "https://tuyensinh.ftu.edu.vn/tra-cuu/",
  table: "verified_advisor_facts",
  recordId: "ftu_ielts_conversion_2026",
};

const IELTS_BAND_PATTERN =
  /(?:ielts\s*(\d(?:[.,]\d)?)|(\d(?:[.,]\d)?)\s*(?:ielts|ielts academic))/iu;

function includesFtuContext(text: string) {
  return /\b(ftu|ngoại thương|ngoai thuong|đại học ngoại thương|dai hoc ngoai thuong)\b/iu.test(
    text,
  );
}

function includesIeltsConversionContext(text: string) {
  return (
    /\bielts\b/iu.test(text) &&
    /\b(quy đổi|quy doi|bao nhiêu điểm|bao nhieu diem|được mấy điểm|duoc may diem|được bao nhiêu|duoc bao nhieu)\b/iu.test(
      text,
    )
  );
}

function extractIeltsBand(text: string) {
  const match = text.match(IELTS_BAND_PATTERN);
  const rawBand = match?.[1] ?? match?.[2];
  if (!rawBand) return null;

  const band = Number(rawBand.replace(",", "."));
  return Number.isFinite(band) ? band : null;
}

function convertKnownFtuIeltsBand(band: number | null) {
  if (band === 6.5) return 8.5;
  if (band !== null && band >= 8) return 10;
  return null;
}

export function buildVerifiedAdvisorFacts({
  question,
  chatHistory = [],
}: {
  question: string;
  chatHistory?: AdvisorHistoryMessage[];
}): { ftuIeltsConversion?: VerifiedAdvisorFactResult } | undefined {
  const recentHistoryText = chatHistory
    .slice(-6)
    .map((message) => message.content)
    .join("\n");
  const combinedText = [recentHistoryText, question].filter(Boolean).join("\n");

  if (!includesFtuContext(combinedText)) return undefined;
  if (!includesIeltsConversionContext(combinedText)) return undefined;

  const band = extractIeltsBand(question) ?? extractIeltsBand(combinedText);

  return {
    ftuIeltsConversion: {
      status: "success",
      data: {
        schoolCode: "FTU",
        schoolName: "Đại học Ngoại thương",
        certificate: "IELTS Academic",
        band,
        convertedScoreOutOf10: convertKnownFtuIeltsBand(band),
        rules: [
          {
            condition: "IELTS Academic 6.5",
            convertedScoreOutOf10: 8.5,
          },
          {
            condition: "IELTS Academic từ 8.0 trở lên",
            convertedScoreOutOf10: 10,
          },
        ],
        note:
          "Khi trả lời về quy đổi IELTS tại FTU, phải dùng rule này nếu câu hỏi/hội thoại nhắc tới FTU. Không suy diễn IELTS 6.5 thành 9.0, 9.5 hoặc 10; IELTS 8.0 trở lên mới được quy đổi 10.",
      },
      sources: [FTU_IELTS_CONVERSION_SOURCE],
    },
  };
}
