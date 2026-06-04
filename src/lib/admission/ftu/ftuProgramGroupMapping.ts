import type { ExistingFTUProgram, FTUProgramGroup } from "./ftuTypes";

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function resolveFTUProgramGroup(
  program: ExistingFTUProgram | { name?: string; code?: string },
): FTUProgramGroup | null {
  const combinedText = [
    program.name,
    program.code,
    "program_name" in program ? program.program_name : undefined,
    "program_code" in program ? program.program_code : undefined,
    "major_name" in program ? program.major_name : undefined,
    "major_code" in program ? program.major_code : undefined,
  ]
    .filter(Boolean)
    .join(" ");
  const normalized = normalizeText(combinedText);

  if (
    normalized.includes("khoa hoc may tinh") ||
    normalized.includes("tri tue nhan tao") ||
    normalized.includes("khoa hoc du lieu")
  ) {
    return "TECH_DATA_AI";
  }

  if (normalized.includes("ngon ngu thuong mai")) {
    return "COMMERCIAL_LANGUAGE";
  }

  if (
    normalized.includes("tieu chuan") ||
    normalized.includes("chat luong cao") ||
    normalized.includes("dinh huong nghe nghiep quoc te") ||
    normalized.includes("luat dan su va thuong mai quoc te")
  ) {
    return "STANDARD_INTEGRATED";
  }

  return null;
}
