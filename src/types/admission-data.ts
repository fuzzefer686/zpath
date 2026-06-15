export type School = {
  id: string;
  code: string;
  name: string;
  short_name: string | null;
  aliases: string[];
  slug: string;
  english_name: string | null;
  type: string | null;
  city: string | null;
  address: string | null;
  website: string | null;
  fanpage: string | null;
  hero_image_url: string | null;
  description: string | null;
  source_url: string | null;
  last_checked_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type AdmissionMethodRecord = {
  id: string;
  school_code: string;
  method_code: string;
  method_name: string;
  year: number;
  description: string | null;
  is_active: boolean | null;
  source_url: string | null;
  created_at: string | null;
};

export type AdmissionProgram = {
  id: string;
  school_code: string;
  program_code: string | null;
  program_name: string;
  major_code: string | null;
  major_name: string | null;
  year: number;
  quota: number | null;
  degree_level: string | null;
  training_type: string | null;
  note: string | null;
  source_url: string | null;
  created_at: string | null;
};

export type SubjectCombination = {
  id: string;
  code: string;
  subjects: string[];
  description: string | null;
};

export type ProgramCombination = {
  id: string;
  program_id: string | null;
  combination_code: string;
  year: number;
  method_code: string | null;
  source_url: string | null;
};

export type Benchmark = {
  id: string;
  school_code: string;
  program_id: string | null;
  admission_programs?: {
    program_code: string | null;
    program_name?: string | null;
    major_code?: string | null;
    major_name?: string | null;
    year: number;
  } | null;
  year: number;
  method_code: string;
  combination_code: string | null;
  score: number;
  scale: number | null;
  note: string | null;
  source_url: string | null;
  created_at: string | null;
};

export type TuitionFee = {
  id: string;
  school_code: string;
  program_id: string | null;
  year: number;
  min_fee: number | null;
  max_fee: number | null;
  currency: string | null;
  unit: string | null;
  description: string | null;
  note: string | null;
  source_url: string | null;
  created_at: string | null;
};

export type AdmissionInfo = {
  id: string;
  school_code: string;
  year: number;
  total_quota: number | null;
  admission_scope: string | null;
  application_timeline: string | null;
  eligibility: string | null;
  notes: string | null;
  source_url: string | null;
  created_at: string | null;
};

export type DataSource = {
  id: string;
  entity_type: string;
  entity_id: string | null;
  school_code: string | null;
  source_name: string | null;
  source_url: string;
  source_type: string | null;
  verified_status: string | null;
  last_checked_at: string | null;
  note: string | null;
  created_at: string | null;
};
