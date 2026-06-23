import assert from "node:assert/strict";

import { POST } from "@/app/api/certificate-converter/route";

async function testInvalidJsonBody() {
  const request = new Request("http://localhost/api/certificate-converter", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{invalid",
  });
  const response = await POST(request);
  const json = (await response.json()) as { ok: boolean; error?: string };

  assert.equal(response.status, 400);
  assert.equal(json.ok, false);
  assert.ok(json.error?.includes("JSON"));
}

async function testMissingCertificateType() {
  const request = new Request("http://localhost/api/certificate-converter", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: {
        score: 6.5,
      },
    }),
  });
  const response = await POST(request);
  const json = (await response.json()) as { ok: boolean; error?: string };

  assert.equal(response.status, 400);
  assert.equal(json.ok, false);
  assert.ok(json.error?.includes("certificateType"));
}

async function main() {
  await testInvalidJsonBody();
  await testMissingCertificateType();
  console.log("certificateConverterApi.test.ts passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
