import assert from "node:assert/strict";
import test from "node:test";
import { calculateNeuPriorityScore } from "./types";
import { convertCertificateToNeuScore } from "./language-certificate";
import { calculateNeuThptScore } from "./neu.thpt";
import { calculateNeuDgnlScore } from "./neu.dgnl";
import { calculateNeuSatActScore } from "./neu.sat-act";
import { neuModule } from "./index";





test("calculateNeuPriorityScore below 22.5", () => {
    // totalScore < 22.5: Priority should be totalBase (KV + DoiTuong)
    const score = calculateNeuPriorityScore(20, {
        kv: "KV1",
        doiTuong: "UT1",
    });
    // base = 0.75 + 2.0 = 2.75
    assert.equal(score, 2.75);
});

test("calculateNeuPriorityScore at exactly 22.5", () => {
    // totalScore = 22.5: Priority should be exactly totalBase
    const score = calculateNeuPriorityScore(22.5, {
        kv: "KV1",
        doiTuong: "NONE",
    });
    // base = 0.75
    assert.equal(score, 0.75);
});

test("calculateNeuPriorityScore above 22.5 with diminishing priority", () => {
    // totalScore = 25.0, kv = KV2NT (0.5), UT = NONE (0)
    // formula: ((30 - 25) / 7.5) * 0.5 = (5 / 7.5) * 0.5 = 0.3333... -> 0.33
    const score = calculateNeuPriorityScore(25, {
        kv: "KV2NT",
        doiTuong: "NONE",
    });
    assert.equal(score, 0.33);
});

test("calculateNeuPriorityScore at maximum 30.0", () => {
    // totalScore = 30: Priority should be 0
    const score = calculateNeuPriorityScore(30, {
        kv: "KV1",
        doiTuong: "UT1",
    });
    assert.equal(score, 0);
});

test("convertCertificateToNeuScore undefined", () => {
    assert.equal(convertCertificateToNeuScore(undefined), 0);
});

test("convertCertificateToNeuScore IELTS", () => {
    assert.equal(convertCertificateToNeuScore({ type: "IELTS", score: 8.5 }), 10.0);
    assert.equal(convertCertificateToNeuScore({ type: "IELTS", score: 7.0 }), 9.5);
    assert.equal(convertCertificateToNeuScore({ type: "IELTS", score: 6.5 }), 9.0);
    assert.equal(convertCertificateToNeuScore({ type: "IELTS", score: 6.0 }), 8.5);
    assert.equal(convertCertificateToNeuScore({ type: "IELTS", score: 5.5 }), 8.0);
    assert.equal(convertCertificateToNeuScore({ type: "IELTS", score: 5.0 }), 0.0);
});

test("convertCertificateToNeuScore TOEFL", () => {
    assert.equal(convertCertificateToNeuScore({ type: "TOEFL", score: 105 }), 10.0);
    assert.equal(convertCertificateToNeuScore({ type: "TOEFL", score: 95 }), 9.5);
    assert.equal(convertCertificateToNeuScore({ type: "TOEFL", score: 85 }), 9.0);
    assert.equal(convertCertificateToNeuScore({ type: "TOEFL", score: 70 }), 8.5);
    assert.equal(convertCertificateToNeuScore({ type: "TOEFL", score: 50 }), 8.0);
    assert.equal(convertCertificateToNeuScore({ type: "TOEFL", score: 40 }), 0.0);
});

test("convertCertificateToNeuScore TOEIC", () => {
    // 10: lr >= 965, s >= 190, w >= 190
    assert.equal(
        convertCertificateToNeuScore({ type: "TOEIC", score: 970, speaking: 190, writing: 195 }),
        10.0
    );
    // 9.5: lr >= 945, s >= 180, w >= 180
    assert.equal(
        convertCertificateToNeuScore({ type: "TOEIC", score: 950, speaking: 180, writing: 180 }),
        9.5
    );
    // Fail 9.5 due to speaking, falls to 9.0
    assert.equal(
        convertCertificateToNeuScore({ type: "TOEIC", score: 950, speaking: 175, writing: 180 }),
        9.0
    );
    // 8.0: lr >= 785, s >= 160, w >= 150
    assert.equal(
        convertCertificateToNeuScore({ type: "TOEIC", score: 790, speaking: 160, writing: 150 }),
        8.0
    );
    // Below minimum
    assert.equal(
        convertCertificateToNeuScore({ type: "TOEIC", score: 700, speaking: 160, writing: 150 }),
        0.0
    );
});

test("calculateNeuThptScore Case 2: Pure THPT", () => {
    const scores = {
        toán: 8.0,
        văn: 7.0,
        lý: 9.0,
        hóa: 7.0,
        anh: 8.0,
    };

    // A00: toán (8) + lý (9) + hóa (7) = 24.
    // Profile: kv = KV2NT (0.5), doiTuong = NONE (0), base = 0.5.
    // totalScore = 24 >= 22.5. Priority = ((30 - 24) / 7.5) * 0.5 = 0.4.
    // Prize: GiaiBa = 0.5.
    // Expected = 24 + 0.4 + 0.5 = 24.90
    const result = calculateNeuThptScore(
        scores,
        {
            kv: "KV2NT",
            doiTuong: "NONE",
            uuTienXetTuyen: "GiaiBa",
        },
        "A00"
    );
    assert.equal(result, 24.90);
});

test("calculateNeuThptScore Case 1: Combined THPT + Cert", () => {
    const scores = {
        toán: 8.5,
        văn: 7.5,
        lý: 7.0,
        hóa: 8.0,
        anh: 9.0,
    };

    // D01: toán (8.5) + văn (7.5) + IELTS 6.5 (9.0) = 25.0
    // Profile: kv = KV2 (0.25), doiTuong = UT2 (1.0) -> base = 1.25.
    // totalScore = 25 >= 22.5. Priority = ((30 - 25) / 7.5) * 1.25 = 0.6666... * 1.25 = 0.8333... -> 0.83
    // Expected = 25 + 0.83 = 25.83
    const result = calculateNeuThptScore(
        scores,
        {
            kv: "KV2",
            doiTuong: "UT2",
            certificate: { type: "IELTS", score: 6.5 },
        },
        "D01"
    );
    assert.equal(result, 25.83);
});

test("calculateNeuThptScore Max Cap of 30.00", () => {
    const scores = {
        toán: 10.0,
        văn: 10.0,
        lý: 10.0,
        hóa: 10.0,
        anh: 10.0,
    };

    // Pure THPT A00 = 30.0
    // Expected capped at 30.00
    const result = calculateNeuThptScore(
        scores,
        {
            kv: "KV1",
            doiTuong: "UT1",
        },
        "A00"
    );
    assert.equal(result, 30.00);
});

test("calculateNeuThptScore Maximization (Both Cert and Prize)", () => {
    const scores = {
        toán: 8.5,
        văn: 7.0,
        lý: 9.0,
        hóa: 8.0,
        anh: 4.0, // Low English score
    };

    // Profile has both IELTS 6.5 (9.0) and GiaiNhat (1.5)
    // Combination D01 (toán, văn, anh)
    // Path 1 (Combined - PTXT4):
    // total = 9.0 (IELTS) + 8.5 (toán) + 7.0 (văn) = 24.5
    // priority = ((30 - 24.5) / 7.5) * 0.25 = 0.18
    // totalCombined = 24.5 + 0.18 = 24.68
    // Path 2 (Pure - PTXT5):
    // total = 8.5 (toán) + 7.0 (văn) + 4.0 (anh) = 19.5
    // priority = 0.25 (since 19.5 < 22.5)
    // prize = 1.5
    // totalPure = 19.5 + 0.25 + 1.5 = 21.25
    // Maximization should choose Path 1 (24.68)
    const result = calculateNeuThptScore(
        scores,
        {
            kv: "KV2",
            doiTuong: "NONE",
            uuTienXetTuyen: "GiaiNhat",
            certificate: { type: "IELTS", score: 6.5 },
        },
        "D01"
    );
    assert.equal(result, 24.68);
});

test("calculateNeuDgnlScore Case 2: Pure HSA", () => {
    // HSA raw = 100 -> score_30 = 100 * 30 / 150 = 20.0
    // Profile: KV1 (0.75), UT: NONE (0)
    // expected = 20.0 + 0.75 = 20.75
    const result = calculateNeuDgnlScore(
        { hsa: 100 },
        { kv: "KV1", doiTuong: "NONE" },
        "HSA"
    );
    assert.equal(result, 20.75);
});

test("calculateNeuDgnlScore Case 1: Combined TSA + IELTS", () => {
    // TSA raw = 60 -> score_30 = 60 * 30 / 100 = 18.0
    // IELTS 5.5 -> cert = 8.0
    // baseScore = (8.0 * 2 + 18.0) * 0.75 = 34 * 0.75 = 25.5
    // Profile: KV2NT (0.5), UT: NONE (0) -> base = 0.5
    // total = 25.5 >= 22.5. Priority = ((30 - 25.5) / 7.5) * 0.5 = 0.3
    // expected = 25.5 + 0.3 = 25.80
    const result = calculateNeuDgnlScore(
        { tsa: 60 },
        {
            kv: "KV2NT",
            doiTuong: "NONE",
            certificate: { type: "IELTS", score: 5.5 },
        },
        "TSA"
    );
    assert.equal(result, 25.80);
});

test("calculateNeuDgnlScore Case 1: Combined VACT + TOEFL (Capped)", () => {
    // VACT raw = 1000 -> score_30 = 1000 * 30 / 1200 = 25.0
    // TOEFL 105 -> cert = 10.0
    // baseScore = (10.0 * 2 + 25.0) * 0.75 = 45 * 0.75 = 33.75
    // expected capped at 30.00
    const result = calculateNeuDgnlScore(
        { vact: 1000 },
        {
            kv: "KV1",
            doiTuong: "UT1",
            certificate: { type: "TOEFL", score: 105 },
        },
        "VACT"
    );
    assert.equal(result, 30.00);
});

test("calculateNeuSatActScore Threshold Failure", () => {
    // SAT < 1200 -> returns 0
    assert.equal(
        calculateNeuSatActScore("SAT", 1150, { kv: "KV3", doiTuong: "NONE" }),
        0.0
    );
    // ACT < 26 -> returns 0
    assert.equal(
        calculateNeuSatActScore("ACT", 25, { kv: "KV3", doiTuong: "NONE" }),
        0.0
    );
});

test("calculateNeuSatActScore SAT success", () => {
    // SAT = 1440 -> score_30 = 1440 * 30 / 1600 = 27.0
    // Profile: kv = KV2NT (0.5), UT: NONE (0)
    // priority = ((30 - 27) / 7.5) * 0.5 = 0.20
    // expected = 27.20
    const result = calculateNeuSatActScore("SAT", 1440, {
        kv: "KV2NT",
        doiTuong: "NONE",
    });
    assert.equal(result, 27.20);
});

test("calculateNeuSatActScore ACT success", () => {
    // ACT = 30 -> score_30 = 30 * 30 / 36 = 25.0
    // Profile: kv = KV2 (0.25), UT: NONE (0)
    // priority = ((30 - 25) / 7.5) * 0.25 = 0.1666... -> 0.17
    // expected = 25.17
    const result = calculateNeuSatActScore("ACT", 30, {
        kv: "KV2",
        doiTuong: "NONE",
    });
    assert.equal(result, 25.17);
});

test("neuModule.calculate THPT", () => {
    const result = neuModule.calculate({
        schoolCode: "NEU",
        method: "THPT",
        year: 2026,
        payload: {
            scores: { toán: 8.0, văn: 7.0, lý: 9.0, hóa: 7.0, anh: 8.0 },
            profile: { kv: "KV2NT", doiTuong: "NONE", uuTienXetTuyen: "GiaiBa" },
            combination: "A00"
        }
    });

    assert.equal(result.schoolCode, "NEU");
    assert.equal(result.method, "THPT");
    assert.equal(result.originalScore, 24.90);
    assert.equal(result.formulaUsed, "PTXT5_PURE_THPT");
});

test("neuModule.calculate DGNL (SAT)", () => {
    const result = neuModule.calculate({
        schoolCode: "NEU",
        method: "DGNL",
        year: 2026,
        payload: {
            type: "SAT",
            score: 1440,
            profile: { kv: "KV2NT", doiTuong: "NONE" }
        }
    });

    assert.equal(result.schoolCode, "NEU");
    assert.equal(result.method, "DGNL");
    assert.equal(result.originalScore, 27.20);
    assert.equal(result.formulaUsed, "PTXT1_SAT");
});





