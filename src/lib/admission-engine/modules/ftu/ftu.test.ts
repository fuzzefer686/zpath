import assert from "node:assert/strict";
import test from "node:test";

import {
  convertEnglishCertToScore10,
  convertHsaToScale30,
} from "@/src/lib/admission-data/ftu-conversions-2026";
import {
  applyFtuPriority,
  computeFtuBonus30,
} from "@/src/lib/admission-data/ftu-priority-2026";
import { calculateAdmissionScore } from "../../core/engine";
import type { AdmissionInput } from "../../core/types";
import { calculateFtuDgnlScore } from "./ftu.dgnl";
import { calculateFtuHocBaScore } from "./ftu.hocba";
import { calculateFtuThptScore } from "./ftu.thpt";
import { calculateFtuXttEligibility } from "./ftu.xtt";

test("FTU học bạ nhóm 1 cộng đơn giản 3 môn (thang 30)", () => {
  const result = calculateFtuHocBaScore({
    schoolCode: "FTU",
    method: "HOC_BA",
    year: 2026,
    payload: {
      programCode: "NTH.KT.H02",
      combinationCode: "A00",
      scores: { math: 8, physics: 9, chemistry: 7 },
    },
  } satisfies AdmissionInput);

  assert.equal(result.originalScale, 30);
  assert.equal(result.originalScore, 24);
  assert.equal(result.normalizedScore30, 24);
});

test("FTU THPT nhóm 1 kết hợp CCNNQT thay môn ngoại ngữ", () => {
  const result = calculateFtuThptScore({
    schoolCode: "FTU",
    method: "THPT",
    year: 2026,
    payload: {
      programCode: "NTH.KT.H02",
      combinationCode: "D07",
      useCertificate: true,
      scores: { math: 8, chemistry: 7 },
      certificate: { kind: "english", type: "IELTS", value: 7.0 },
    },
  });

  // M1=8, M2=Hóa 7, M3=IELTS 7.0 -> 9.0 => 24
  assert.equal(result.normalizedScore30, 24);
  assert.equal(result.details?.useCertificate, true);
});

test("FTU nhóm 2 nhân đôi Toán (thang 40) quy về thang 30", () => {
  const result = calculateFtuHocBaScore({
    schoolCode: "FTU",
    method: "HOC_BA",
    year: 2026,
    payload: {
      programCode: "NTH.CN.H18",
      combinationCode: "A00",
      scores: { math: 8, physics: 9, chemistry: 7 },
    },
  });

  assert.equal(result.originalScale, 40);
  assert.equal(result.originalScore, 32); // 8*2 + 9 + 7
  assert.equal(result.normalizedScore30, 24); // 32 * 3/4
});

test("FTU nhóm 3 Văn & Ngoại ngữ hệ số 1.5 (thang 40)", () => {
  const result = calculateFtuHocBaScore({
    schoolCode: "FTU",
    method: "HOC_BA",
    year: 2026,
    payload: {
      programCode: "NTH.NN.H19",
      combinationCode: "D01",
      scores: { math: 8, literature: 7, english: 9 },
    },
  });

  assert.equal(result.originalScale, 40);
  assert.equal(result.originalScore, 32); // 8 + 7*1.5 + 9*1.5
  assert.equal(result.normalizedScore30, 24);
});

test("FTU nhóm 3 kết hợp CCNNQT", () => {
  const result = calculateFtuHocBaScore({
    schoolCode: "FTU",
    method: "HOC_BA",
    year: 2026,
    payload: {
      programCode: "NTH.NN.H20",
      combinationCode: "D01",
      useCertificate: true,
      scores: { math: 8, literature: 7 },
      certificate: { kind: "english", type: "IELTS", value: 8.0 },
    },
  });

  // 8 + 7*1.5 + 10*1.5 = 33.5 (thang 40) -> 25.125 -> 25.13
  assert.equal(result.originalScore, 33.5);
  assert.equal(result.normalizedScore30, 25.13);
});

test("FTU điểm ưu tiên TH2 quy đổi khi tổng < 30", () => {
  const result = calculateFtuHocBaScore({
    schoolCode: "FTU",
    method: "HOC_BA",
    year: 2026,
    payload: {
      programCode: "NTH.KT.H02",
      combinationCode: "A00",
      scores: { math: 7, physics: 7, chemistry: 7 },
      priority: {
        awards: ["NATIONAL_THIRD"], // +1.5
        regionPriority: 0.75,
        subjectPriority: 2.0,
      },
    },
  });

  // base 21 + bonus 1.5 = 22.5; ((30-22.5)/7.5)*(2.75) = 2.75 => 25.25
  assert.equal(result.normalizedScore30, 25.25);
  assert.equal(result.details?.priorityBranch, "TH2_CONVERTED_PRIORITY");
});

test("FTU điểm ưu tiên TH1 không cộng ưu tiên khi đạt trần", () => {
  const result = calculateFtuHocBaScore({
    schoolCode: "FTU",
    method: "HOC_BA",
    year: 2026,
    payload: {
      programCode: "NTH.KT.H02",
      combinationCode: "A00",
      scores: { math: 10, physics: 10, chemistry: 9 },
      priority: { awards: ["NATIONAL_FIRST"], regionPriority: 0.75, subjectPriority: 2.0 },
    },
  });

  // base 29 + bonus 3 = 32 >= 30 -> trần 30, không cộng ưu tiên
  assert.equal(result.normalizedScore30, 30);
  assert.equal(result.details?.priorityBranch, "TH1_NO_PRIORITY");
});

test("FTU điểm thưởng chọn giải cao nhất và cap tại 3", () => {
  assert.equal(computeFtuBonus30({ awards: ["NATIONAL_THIRD", "NATIONAL_FIRST"] }), 3);
  assert.equal(computeFtuBonus30({ awards: ["NATIONAL_TEAM"] }), 0.5);
  assert.equal(computeFtuBonus30({ bonusScore: 5 }), 3);
  assert.equal(computeFtuBonus30(), 0);
});

test("FTU ĐGNL HSA nhóm 1 (thang 30)", () => {
  const result = calculateFtuDgnlScore({
    schoolCode: "FTU",
    method: "DGNL",
    year: 2026,
    payload: { programCode: "NTH.KT.H02", testType: "HSA", testScore: 125 },
  });

  assert.equal(result.originalScale, 30);
  assert.equal(result.normalizedScore30, 28.5); // 27 + (125-100)*3/50
});

test("FTU ĐGNL HSA nhóm 2 quy sang thang 40", () => {
  const result = calculateFtuDgnlScore({
    schoolCode: "FTU",
    method: "DGNL",
    year: 2026,
    payload: { programCode: "NTH.CN.H18", testType: "HSA", testScore: 125 },
  });

  assert.equal(result.originalScale, 40);
  assert.equal(result.originalScore, 38); // 28.5 * 4/3
  assert.equal(result.normalizedScore30, 28.5);
});

test("FTU ĐGTD TSA chỉ áp dụng cho nhóm 2", () => {
  const result = calculateFtuDgnlScore({
    schoolCode: "FTU",
    method: "DGNL",
    year: 2026,
    payload: { programCode: "NTH.CN.H18", testType: "TSA", testScore: 85 },
  });

  assert.equal(result.originalScore, 38); // (27 + (85-70)*3/30) * 4/3
  assert.equal(result.normalizedScore30, 28.5);

  assert.throws(
    () =>
      calculateFtuDgnlScore({
        schoolCode: "FTU",
        method: "DGNL",
        year: 2026,
        payload: { programCode: "NTH.KT.H02", testType: "TSA", testScore: 85 },
      }),
    /không xét tuyển bằng/,
  );
});

test("FTU ĐGNL quốc tế SAT + CCNNQT nhóm 1 và nhóm 3", () => {
  const group1 = calculateFtuDgnlScore({
    schoolCode: "FTU",
    method: "DGNL",
    year: 2026,
    payload: {
      programCode: "NTH.KT.H02",
      testType: "SAT",
      testScore: 1450,
      certificate: { kind: "english", type: "IELTS", value: 6.5 },
    },
  });
  // SAT 1450 -> 18.5 ; IELTS 6.5 -> 8.5 ; M1+M2 = 27
  assert.equal(group1.normalizedScore30, 27);

  const group3 = calculateFtuDgnlScore({
    schoolCode: "FTU",
    method: "DGNL",
    year: 2026,
    payload: {
      programCode: "NTH.NN.H19",
      testType: "SAT",
      testScore: 1450,
      certificate: { kind: "english", type: "IELTS", value: 6.5 },
    },
  });
  // M1 + M2*2 = 18.5 + 17 = 35.5 (thang 40) -> 26.625 -> 26.63
  assert.equal(group3.originalScore, 35.5);
  assert.equal(group3.normalizedScore30, 26.63);
});

test("FTU ĐGNL A-Level + CCNNQT", () => {
  const result = calculateFtuDgnlScore({
    schoolCode: "FTU",
    method: "DGNL",
    year: 2026,
    payload: {
      programCode: "NTH.KT.H02",
      testType: "ALEVEL",
      aLevelMath: "A",
      aLevelOther: "A",
      certificate: { kind: "english", type: "IELTS", value: 7.0 },
    },
  });

  // 9 + 9 + 9 = 27
  assert.equal(result.normalizedScore30, 27);
});

test("FTU ĐGNL SAT dưới ngưỡng bị từ chối", () => {
  assert.throws(
    () =>
      calculateFtuDgnlScore({
        schoolCode: "FTU",
        method: "DGNL",
        year: 2026,
        payload: {
          programCode: "NTH.KT.H02",
          testType: "SAT",
          testScore: 1300,
          certificate: { kind: "english", type: "IELTS", value: 6.5 },
        },
      }),
    /SAT phải đạt từ 1380/,
  );
});

test("FTU xét tuyển thẳng: đối tượng c đủ điều kiện, đối tượng d cần >= 24.0", () => {
  const objectC = calculateFtuXttEligibility({
    schoolCode: "FTU",
    method: "XTT",
    year: 2026,
    payload: { object: "c" },
  });
  assert.equal(objectC.details?.eligible, true);
  assert.equal(objectC.normalizedScore30, 0);

  const objectDFail = calculateFtuXttEligibility({
    schoolCode: "FTU",
    method: "XTT",
    year: 2026,
    payload: { object: "d", totalThreeSubjects: 23 },
  });
  assert.equal(objectDFail.details?.eligible, false);

  const objectDPass = calculateFtuXttEligibility({
    schoolCode: "FTU",
    method: "XTT",
    year: 2026,
    payload: { object: "d", totalThreeSubjects: 24 },
  });
  assert.equal(objectDPass.details?.eligible, true);
});

test("FTU từ chối tổ hợp không hợp lệ với chương trình", () => {
  assert.throws(
    () =>
      calculateFtuHocBaScore({
        schoolCode: "FTU",
        method: "HOC_BA",
        year: 2026,
        payload: {
          programCode: "NTH.CN.H18",
          combinationCode: "D02",
          scores: { math: 8, literature: 7, russian: 9 },
        },
      }),
    /không hỗ trợ tổ hợp/,
  );
});

test("FTU engine dispatch và contract targetScale 30", () => {
  const result = calculateAdmissionScore({
    schoolCode: "FTU",
    method: "THPT",
    year: 2026,
    payload: {
      programCode: "NTH.KT.H02",
      combinationCode: "A00",
      scores: { math: 8, physics: 9, chemistry: 7 },
    },
  });

  assert.equal(result.targetScale, 30);
  assert.equal(result.normalizedScore30, 24);
});

test("FTU bảng quy đổi tiếng Anh và công thức HSA chính xác", () => {
  assert.equal(convertEnglishCertToScore10({ type: "IELTS", value: 6.5 })?.score, 8.5);
  assert.equal(convertEnglishCertToScore10({ type: "IELTS", value: 8.0 })?.score, 10);
  assert.equal(convertEnglishCertToScore10({ type: "IELTS", value: 3.5 }), null);
  assert.equal(convertHsaToScale30(150), 30);
});

test("FTU applyFtuPriority đồng nhất thang 30 và thang 40", () => {
  const scale30 = applyFtuPriority({
    baseScore: 21,
    scale: 30,
    bonus30: 1.5,
    regionPriority30: 0.75,
    subjectPriority30: 2.0,
  });
  const scale40 = applyFtuPriority({
    baseScore: 28,
    scale: 40,
    bonus30: 1.5,
    regionPriority30: 0.75,
    subjectPriority30: 2.0,
  });

  assert.equal(Number(scale30.normalizedScore30.toFixed(2)), 25.25);
  // base 28 (thang 40) tương đương 21 (thang 30) -> cùng normalized30
  assert.equal(Number(scale40.normalizedScore30.toFixed(2)), 25.25);
});
