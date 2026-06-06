export function roundHalfUp(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function getCurrentDateISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function yearsBetween(fromISO: string, toISO: string): number {
  return new Date(toISO).getFullYear() - new Date(fromISO).getFullYear();
}
