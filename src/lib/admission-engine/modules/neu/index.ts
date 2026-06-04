import type {
    AdmissionInput,
    AdmissionScoreResult,
    SchoolAdmissionModule,
} from "../../core/types";

import { HighSchoolScores, CompetencyScores, CandidateProfile } from "./types";
import { calculateNeuThptScore } from "./neu.thpt";
import { calculateNeuDgnlScore } from "./neu.dgnl";
import { calculateNeuSatActScore } from "./neu.sat-act";

// Re-export all sub-modules for public API access
export * from "./types";
export * from "./language-certificate";
export * from "./neu.thpt";
export * from "./neu.dgnl";
export * from "./neu.sat-act";

interface NeuThptInputPayload {
    scores: HighSchoolScores;
    profile: CandidateProfile;
    combination: "A00" | "A01" | "D01" | "D07";
}

interface NeuDgnlInputPayload {
    type: "HSA" | "VACT" | "TSA" | "SAT" | "ACT";
    profile: CandidateProfile;
    score?: number; // Used for SAT/ACT
    compScores?: CompetencyScores; // Used for HSA/VACT/TSA
}

function calculate(input: AdmissionInput): AdmissionScoreResult {
    const warnings = ["Kết quả tính điểm chỉ mang tính tham khảo và cần đối chiếu với đề án chính thức của NEU."];

    switch (input.method) {
        case "THPT": {
            const payload = input.payload as NeuThptInputPayload;
            if (!payload.scores || !payload.profile || !payload.combination) {
                throw new Error("Invalid payload for NEU THPT calculation.");
            }

            const score = calculateNeuThptScore(payload.scores, payload.profile, payload.combination);
            const isCombined = payload.profile.certificate &&
                (payload.profile.certificate.score > 0);

            return {
                schoolCode: "NEU",
                method: "THPT",
                year: input.year,
                originalScore: score,
                originalScale: 30,
                normalizedScore30: score,
                targetScale: 30,
                formulaUsed: isCombined ? "PTXT4_COMBINED" : "PTXT5_PURE_THPT",
                details: {
                    combination: payload.combination,
                    scores: payload.scores,
                    profile: payload.profile,
                },
                warnings,
            };
        }

        case "DGNL": {
            const payload = input.payload as NeuDgnlInputPayload;
            if (!payload.type || !payload.profile) {
                throw new Error("Invalid payload for NEU DGNL calculation.");
            }

            let score = 0;
            let formulaUsed = "";

            if (payload.type === "SAT" || payload.type === "ACT") {
                if (payload.score === undefined) {
                    throw new Error(`Missing score for NEU ${payload.type} calculation.`);
                }
                score = calculateNeuSatActScore(payload.type, payload.score, payload.profile);
                formulaUsed = `PTXT1_${payload.type}`;
            } else {
                const compScores = payload.compScores ?? {};
                score = calculateNeuDgnlScore(compScores, payload.profile, payload.type);
                const isCombined = payload.profile.certificate &&
                    (payload.profile.certificate.score > 0);
                formulaUsed = isCombined ? `PTXT3_COMBINED_${payload.type}` : `PTXT2_PURE_${payload.type}`;
            }

            return {
                schoolCode: "NEU",
                method: "DGNL",
                year: input.year,
                originalScore: score,
                originalScale: 30,
                normalizedScore30: score,
                targetScale: 30,
                formulaUsed,
                details: {
                    type: payload.type,
                    score: payload.score,
                    compScores: payload.compScores,
                    profile: payload.profile,
                },
                warnings,
            };
        }

        default:
            throw new Error(`Unsupported NEU admission method: ${input.method}`);
    }
}

export const neuModule: SchoolAdmissionModule = {
    schoolCode: "NEU",
    schoolName: "Đại học Kinh tế Quốc dân",
    supportedMethods: ["THPT", "DGNL"],
    calculate,
};

export default neuModule;
