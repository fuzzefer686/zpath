import assert from "node:assert/strict";
import { resolveFTUProgramGroup } from "@/src/lib/admission";

assert.equal(
  resolveFTUProgramGroup({ name: "Chương trình Khoa học dữ liệu" }),
  "TECH_DATA_AI",
);
assert.equal(
  resolveFTUProgramGroup({ name: "Chương trình tích hợp Ngôn ngữ thương mại" }),
  "COMMERCIAL_LANGUAGE",
);
assert.equal(
  resolveFTUProgramGroup({ name: "Chương trình chất lượng cao Kinh tế đối ngoại" }),
  "STANDARD_INTEGRATED",
);
assert.equal(resolveFTUProgramGroup({ name: "Some unknown FTU program" }), null);

console.log("ftuProgramGroupMapping.test.ts passed");
