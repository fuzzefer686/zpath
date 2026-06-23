import type {
  CertificateConverterRequest,
  CertificateConverterResponse,
  CertificateUserInput,
  ConverterSchoolSummary,
  MethodApplicabilityResult,
  SchoolConverterAdapter,
} from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseOptionalNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || !value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseInput(raw: unknown): CertificateUserInput {
  if (!isRecord(raw)) {
    throw new Error("input phải là object hợp lệ.");
  }
  if (typeof raw.certificateType !== "string" || !raw.certificateType.trim()) {
    throw new Error("input.certificateType là bắt buộc.");
  }

  const input: CertificateUserInput = {
    certificateType: raw.certificateType.trim().toUpperCase(),
  };

  const score = parseOptionalNumber(raw.score);
  if (score !== undefined) {
    input.score = score;
  }

  if (typeof raw.bandId === "string" && raw.bandId.trim()) {
    input.bandId = raw.bandId.trim();
  }

  if (typeof raw.textValue === "string" && raw.textValue.trim()) {
    input.textValue = raw.textValue.trim();
  }

  if (isRecord(raw.toeic)) {
    input.toeic = {
      listening: parseOptionalNumber(raw.toeic.listening),
      speaking: parseOptionalNumber(raw.toeic.speaking),
      reading: parseOptionalNumber(raw.toeic.reading),
      writing: parseOptionalNumber(raw.toeic.writing),
    };
  }

  return input;
}

export function parseCertificateConverterRequest(
  body: unknown,
): CertificateConverterRequest {
  if (!isRecord(body)) {
    throw new Error("Body phải là JSON object.");
  }

  const input = parseInput(body.input);

  const schoolCodes = Array.isArray(body.schoolCodes)
    ? body.schoolCodes
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .map((item) => item.trim().toUpperCase())
    : undefined;

  return {
    input,
    schoolCodes: schoolCodes?.length ? schoolCodes : undefined,
  };
}

function sortResults(results: MethodApplicabilityResult[]) {
  const statusRank: Record<MethodApplicabilityResult["status"], number> = {
    applicable: 0,
    conditional: 1,
    not_applicable: 2,
  };

  return [...results].sort((left, right) => {
    const byStatus = statusRank[left.status] - statusRank[right.status];
    if (byStatus !== 0) return byStatus;
    const bySchool = left.schoolCode.localeCompare(right.schoolCode);
    if (bySchool !== 0) return bySchool;
    return left.methodCode.localeCompare(right.methodCode);
  });
}

export class CertificateConverterService {
  private readonly adapterProvider: () => Promise<SchoolConverterAdapter[]>;
  private readonly schoolProvider: () => Promise<ConverterSchoolSummary[]>;

  constructor(
    options?: {
      adapters?: SchoolConverterAdapter[];
      schoolProvider?: () => Promise<ConverterSchoolSummary[]>;
    },
  ) {
    this.adapterProvider = options?.adapters
      ? async () => options.adapters as SchoolConverterAdapter[]
      : async () => {
          const { createDefaultConverterAdapters } = await import("./registry");
          return createDefaultConverterAdapters();
        };

    this.schoolProvider = options?.schoolProvider
      ? options.schoolProvider
      : async () => {
          const { listConverterSchools } = await import("./registry");
          return listConverterSchools();
        };
  }

  async listSchools() {
    return this.schoolProvider();
  }

  async convert(
    request: CertificateConverterRequest,
  ): Promise<CertificateConverterResponse> {
    const schools = await this.listSchools();
    const selectedCodes = request.schoolCodes
      ? new Set(request.schoolCodes.map((item) => item.toUpperCase()))
      : null;

    const selectedSchools = selectedCodes
      ? schools.filter((school) => selectedCodes.has(school.schoolCode))
      : schools;

    const adapters = await this.adapterProvider();
    const results: MethodApplicabilityResult[] = [];
    const context = { schools };

    for (const school of selectedSchools) {
      for (const adapter of adapters) {
        const supportsSchool =
          adapter.schoolCodes.includes("*") ||
          adapter.schoolCodes.includes(school.schoolCode);
        if (!supportsSchool) continue;

        const partial = await adapter.getResults({
          input: request.input,
          school,
          context,
        });
        if (partial.length) {
          results.push(...partial);
          break;
        }
      }
    }

    return {
      schools: selectedSchools,
      results: sortResults(results),
    };
  }
}
