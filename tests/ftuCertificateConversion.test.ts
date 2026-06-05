import assert from "node:assert/strict";
import {
  __setFTULanguageCertificateConversionRowsForTest,
  findFTULanguageCertificateConversion,
  resolveFTUCertificateConvertedScore,
} from "@/src/lib/admission";
import { createConversionRow } from "./ftuTestHelpers";

async function main() {
  __setFTULanguageCertificateConversionRowsForTest([
    createConversionRow({
      id: "hust-row",
      school_code: "HUST",
      certificate_type: "IELTS",
      min_score: 6.5,
      max_score: 6.5,
      converted_subject_score_out_of_10: 10,
    }),
  ]);

  assert.equal(
    await resolveFTUCertificateConvertedScore({
      certificateType: "IELTS",
      rawScore: 6.5,
    }),
    null,
    "HUST conversion row must not be used for FTU",
  );

  __setFTULanguageCertificateConversionRowsForTest([
    createConversionRow({
      id: "ielts-65",
      certificate_type: "IELTS",
      min_score: 6.5,
      max_score: 6.5,
      converted_subject_score_out_of_10: 9.5,
    }),
  ]);

  const conversion = await findFTULanguageCertificateConversion({
    schoolCode: "FTU",
    effectiveYear: 2026,
    certificateType: "IELTS",
    rawScore: 6.5,
    purpose: "LANGUAGE_SUBJECT_SCORE",
  });

  assert.equal(conversion?.converted_subject_score_out_of_10, 9.5);
  assert.equal(
    await resolveFTUCertificateConvertedScore({
      certificateType: "IELTS",
      rawScore: 6.5,
    }),
    9.5,
  );

  __setFTULanguageCertificateConversionRowsForTest(null);

  console.log("ftuCertificateConversion.test.ts passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
