import "server-only";

import { supabaseServer } from "@/src/lib/db/supabaseServer";
import {
  validateAdmissionConfig,
  type GenericAdmissionConfig,
} from "@/src/lib/admission-engine/generic";

export type AdmissionConfigStatus =
  | "draft"
  | "pending_review"
  | "published"
  | "archived";

export type AdmissionConfigRecord = {
  id: string;
  school_code: string;
  school_name: string;
  year: number;
  status: AdmissionConfigStatus;
  config: GenericAdmissionConfig;
  source_pdf_url: string | null;
  source_pdf_path: string | null;
  version: number;
  created_by: string | null;
  reviewed_by: string | null;
  published_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

const CONFIG_TABLE = "admission_configs";

type SupabaseQueryError = {
  message: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
};

function throwStoreError(operation: string, error: SupabaseQueryError): never {
  const details = error.details ? ` Details: ${error.details}` : "";
  const hint = error.hint ? ` Hint: ${error.hint}` : "";
  throw new Error(
    `Admission config store failed while ${operation}: ${error.message}.${details}${hint}`,
  );
}

/**
 * Returns the published config for a school (latest published year, or a
 * specific year if provided). Returns null when no published config exists.
 * The stored JSON is re-validated so a corrupt row can never reach scoring.
 */
export async function getPublishedAdmissionConfig(
  schoolCode: string,
  year?: number,
): Promise<GenericAdmissionConfig | null> {
  let query = supabaseServer
    .from(CONFIG_TABLE)
    .select("config")
    .eq("school_code", schoolCode.toUpperCase())
    .eq("status", "published")
    .order("year", { ascending: false })
    .limit(1);

  if (year !== undefined) {
    query = query.eq("year", year);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throwStoreError(`loading published config for "${schoolCode}"`, error);
  }

  if (!data?.config) return null;

  const validated = validateAdmissionConfig(data.config);
  return validated.ok ? validated.config : null;
}

/** Lightweight list of schools that currently have a published calculator. */
export async function listPublishedConfigSchools(): Promise<
  Array<{ schoolCode: string; schoolName: string; year: number }>
> {
  const { data, error } = await supabaseServer
    .from(CONFIG_TABLE)
    .select("school_code, school_name, year")
    .eq("status", "published")
    .order("school_code");

  if (error) {
    throwStoreError("listing published config schools", error);
  }

  return (data ?? []).map((row) => ({
    schoolCode: row.school_code,
    schoolName: row.school_name,
    year: row.year,
  }));
}

export async function listAdmissionConfigs(
  status?: AdmissionConfigStatus,
): Promise<AdmissionConfigRecord[]> {
  let query = supabaseServer
    .from(CONFIG_TABLE)
    .select("*")
    .order("updated_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    throwStoreError("listing admission configs", error);
  }

  return (data ?? []) as AdmissionConfigRecord[];
}

export async function getAdmissionConfigById(
  id: string,
): Promise<AdmissionConfigRecord | null> {
  const { data, error } = await supabaseServer
    .from(CONFIG_TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throwStoreError(`loading admission config "${id}"`, error);
  }

  return (data as AdmissionConfigRecord | null) ?? null;
}

export type SaveAdmissionConfigDraftInput = {
  id?: string;
  config: GenericAdmissionConfig;
  sourcePdfUrl?: string | null;
  sourcePdfPath?: string | null;
  createdBy?: string | null;
};

/**
 * Creates or updates a draft config. The config is validated before write so
 * we never persist something the interpreter cannot run. Saving always lands in
 * `draft` status; publishing is a separate, explicit admin action.
 */
export async function saveAdmissionConfigDraft(
  input: SaveAdmissionConfigDraftInput,
): Promise<AdmissionConfigRecord> {
  const validated = validateAdmissionConfig(input.config);
  if (!validated.ok) {
    throw new Error(`Config không hợp lệ: ${validated.errors.join(" ")}`);
  }

  const config = validated.config;
  const basePayload = {
    school_code: config.schoolCode,
    school_name: config.schoolName,
    year: config.year,
    config,
    status: "draft" as const,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { data, error } = await supabaseServer
      .from(CONFIG_TABLE)
      .update({
        ...basePayload,
        ...(input.sourcePdfUrl !== undefined
          ? { source_pdf_url: input.sourcePdfUrl }
          : {}),
        ...(input.sourcePdfPath !== undefined
          ? { source_pdf_path: input.sourcePdfPath }
          : {}),
      })
      .eq("id", input.id)
      .select("*")
      .single();

    if (error) {
      throwStoreError(`updating draft config "${input.id}"`, error);
    }

    return data as AdmissionConfigRecord;
  }

  const { data, error } = await supabaseServer
    .from(CONFIG_TABLE)
    .insert({
      ...basePayload,
      source_pdf_url: input.sourcePdfUrl ?? null,
      source_pdf_path: input.sourcePdfPath ?? null,
      created_by: input.createdBy ?? null,
    })
    .select("*")
    .single();

  if (error) {
    throwStoreError("inserting draft config", error);
  }

  return data as AdmissionConfigRecord;
}

/**
 * Publishes a config: archives any currently published config for the same
 * school + year, then marks the target config published. This is the single
 * gate that makes a school's calculator appear on the main site.
 */
export async function publishAdmissionConfig({
  id,
  reviewedBy,
}: {
  id: string;
  reviewedBy?: string | null;
}): Promise<AdmissionConfigRecord> {
  const target = await getAdmissionConfigById(id);
  if (!target) {
    throw new Error("Không tìm thấy cấu hình cần phê duyệt.");
  }

  const validated = validateAdmissionConfig(target.config);
  if (!validated.ok) {
    throw new Error(
      `Không thể publish vì config không hợp lệ: ${validated.errors.join(" ")}`,
    );
  }

  const { error: archiveError } = await supabaseServer
    .from(CONFIG_TABLE)
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("school_code", target.school_code)
    .eq("year", target.year)
    .eq("status", "published")
    .neq("id", id);

  if (archiveError) {
    throwStoreError("archiving previously published config", archiveError);
  }

  const { data, error } = await supabaseServer
    .from(CONFIG_TABLE)
    .update({
      status: "published",
      reviewed_by: reviewedBy ?? null,
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throwStoreError(`publishing config "${id}"`, error);
  }

  return data as AdmissionConfigRecord;
}

export async function setAdmissionConfigStatus({
  id,
  status,
  reviewedBy,
}: {
  id: string;
  status: AdmissionConfigStatus;
  reviewedBy?: string | null;
}): Promise<AdmissionConfigRecord> {
  const { data, error } = await supabaseServer
    .from(CONFIG_TABLE)
    .update({
      status,
      ...(reviewedBy !== undefined ? { reviewed_by: reviewedBy } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throwStoreError(`updating status for config "${id}"`, error);
  }

  return data as AdmissionConfigRecord;
}
