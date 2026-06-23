import assert from "node:assert/strict";

import {
  CertificateConverterService,
  parseCertificateConverterRequest,
  type SchoolConverterAdapter,
} from "@/src/lib/certificate-converter";
import { evaluateGenericConfigForCertificate } from "@/src/lib/certificate-converter/adapters/generic";
import type { GenericAdmissionConfig } from "@/src/lib/admission-engine/generic";

async function testParseRequest() {
  const parsed = parseCertificateConverterRequest({
    input: {
      certificateType: "ielts_academic",
      score: "6.5",
    },
    schoolCodes: ["hust", "ftu", ""],
  });

  assert.equal(parsed.input.certificateType, "IELTS_ACADEMIC");
  assert.equal(parsed.input.score, 6.5);
  assert.deepEqual(parsed.schoolCodes, ["HUST", "FTU"]);
}

async function testServiceSortAndFilter() {
  const adapter: SchoolConverterAdapter = {
    adapterId: "fake",
    schoolCodes: ["*"],
    async getResults({ school }) {
      if (school.schoolCode === "HUST") {
        return [
          {
            schoolCode: "HUST",
            schoolName: "HUST",
            methodCode: "THPT",
            methodName: "THPT",
            status: "conditional",
            convertedScore: 8.5,
            scoreUnit: "/10",
            reason: "test",
            notes: [],
            sourceLabel: "test",
          },
        ];
      }
      return [
        {
          schoolCode: school.schoolCode,
          schoolName: school.schoolName,
          methodCode: "M1",
          methodName: "M1",
          status: "applicable",
          convertedScore: 9,
          scoreUnit: "/10",
          reason: "test",
          notes: [],
          sourceLabel: "test",
        },
      ];
    },
  };

  const service = new CertificateConverterService({
    adapters: [adapter],
    schoolProvider: async () => [
      { schoolCode: "HUST", schoolName: "HUST", source: "static" },
      { schoolCode: "FTU", schoolName: "FTU", source: "static" },
    ],
  });
  const result = await service.convert({
    input: { certificateType: "IELTS", score: 7.0 },
    schoolCodes: ["HUST", "FTU"],
  });

  assert.equal(result.results.length, 2);
  assert.equal(result.results[0].status, "applicable");
  assert.equal(result.results[1].status, "conditional");
}

async function testGenericEvaluation() {
  const config: GenericAdmissionConfig = {
    schoolCode: "ABC",
    schoolName: "ABC University",
    year: 2026,
    methods: [
      {
        methodCode: "THPT_CERT",
        methodName: "THPT + Cert",
        inputs: [
          {
            key: "englishCert",
            label: "IELTS",
            type: "certificate",
            required: true,
            certificateConfig: {
              certificateType: "IELTS_ACADEMIC",
              mode: "band_table",
              levels: [
                { band: 5.5, convertedScore: 8 },
                { band: 6.5, convertedScore: 9 },
              ],
            },
          },
        ],
        formula: {
          type: "scale_conversion",
          inputKey: "englishCert",
          fromScale: 10,
        },
      },
    ],
  };

  const rows = evaluateGenericConfigForCertificate({
    school: {
      schoolCode: "ABC",
      schoolName: "ABC University",
      source: "config",
    },
    config,
    input: {
      certificateType: "IELTS_ACADEMIC",
      score: 6.5,
    },
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0].status, "applicable");
  assert.equal(rows[0].convertedScore, 9);
}

async function main() {
  await testParseRequest();
  await testServiceSortAndFilter();
  await testGenericEvaluation();
  console.log("certificateConverterService.test.ts passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
