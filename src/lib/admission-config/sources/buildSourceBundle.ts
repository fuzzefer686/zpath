import type {
  AdmissionFetchedPdfSource,
  AdmissionFetchedSource,
  AdmissionSourceBundle,
} from "./types";

const MAX_PROMPT_CHARS = process.env.VERCEL === "1" ? 15_000 : 120_000;

function priorityOf(source: AdmissionFetchedSource): number {
  if (source.role === "primary" && source.kind === "pdf") return 0;
  if (source.role === "primary") return 1;
  if (source.kind === "pdf") return 2;
  return 3;
}

function toPromptChunk(source: AdmissionFetchedSource, index: number): string {
  const label = source.label?.trim() || `Nguồn ${index + 1}`;
  const role = source.role === "primary" ? "PRIMARY" : "SUPPLEMENT";
  const location = source.url ? ` (${source.url})` : "";
  if (source.kind === "pdf") {
    return `[${role}] ${label}${location}\nLoại: PDF (đính kèm binary trong request).`;
  }
  return `[${role}] ${label}${location}\n${source.text}`;
}

function pickPrimaryPdf(
  sources: AdmissionFetchedSource[],
): AdmissionFetchedPdfSource | null {
  const fromPrimary = sources.find(
    (source): source is AdmissionFetchedPdfSource =>
      source.kind === "pdf" && source.role === "primary",
  );
  if (fromPrimary) return fromPrimary;

  return (
    sources.find(
      (source): source is AdmissionFetchedPdfSource => source.kind === "pdf",
    ) ?? null
  );
}

function limitPromptContext(value: string): string {
  if (value.length <= MAX_PROMPT_CHARS) return value;
  return `${value.slice(0, MAX_PROMPT_CHARS)}\n\n[TRUNCATED]`;
}

export function buildSourceBundle(
  fetchedSources: AdmissionFetchedSource[],
): AdmissionSourceBundle {
  const ordered = [...fetchedSources].sort((a, b) => priorityOf(a) - priorityOf(b));
  const promptContext = limitPromptContext(
    ordered.map((source, index) => toPromptChunk(source, index)).join("\n\n"),
  );
  const primaryPdf = pickPrimaryPdf(ordered);
  const additionalPdfs = ordered.filter(
    (source): source is AdmissionFetchedPdfSource =>
      source.kind === "pdf" && (!primaryPdf || source !== primaryPdf),
  );
  const sourceUrl = ordered.find((source) => source.url)?.url;

  return {
    promptContext,
    primaryPdf,
    additionalPdfs,
    sourceUrl,
  };
}
