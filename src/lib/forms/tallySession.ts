export const ZPATH_TALLY_SESSION_STORAGE_KEY = "zpath:tally_session_id";
export const ZPATH_SURVEY_NEXT_STORAGE_KEY = "zpath:survey_next_path";

export function isValidTallySessionId(value: string | null | undefined): value is string {
  const trimmed = value?.trim();

  if (!trimmed) return false;

  return trimmed !== "{session_id}" && !trimmed.includes("{") && !trimmed.includes("}");
}
