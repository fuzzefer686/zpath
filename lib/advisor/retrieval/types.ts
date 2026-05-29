export type AdvisorInternalSource = {
  sourceType: "zpath_database";
  title: string;
  url?: string;
  table?: string;
  recordId?: string;
};

export type AdvisorRetrievalStatus =
  | "success"
  | "empty"
  | "unavailable"
  | "error";

export type AdvisorRetrievalResult<T> = {
  status: AdvisorRetrievalStatus;
  data: T[];
  sources: AdvisorInternalSource[];
  reason?: string;
};

export type AdvisorRetrievalSingleResult<T> = {
  status: AdvisorRetrievalStatus;
  data: T | null;
  sources: AdvisorInternalSource[];
  reason?: string;
};

export type SchoolSearchResult = {
  id: string;
  code: string;
  name: string;
  slug: string;
  englishName: string | null;
  type: string | null;
  city: string | null;
  website: string | null;
  sourceUrl: string | null;
  lastCheckedAt: string | null;
};

export type MajorSearchResult = {
  id: string;
  name: string;
  code: string | null;
  category: string | null;
  schoolCode: string | null;
  schoolName: string | null;
  programCode: string | null;
  programName: string | null;
  year: number | null;
  sourceUrl: string | null;
};

export type SchoolProfile = SchoolSearchResult & {
  address: string | null;
  fanpage: string | null;
  description: string | null;
};

export type MajorProfile = {
  programId: string;
  schoolCode: string;
  schoolName: string | null;
  programCode: string | null;
  programName: string;
  majorCode: string | null;
  majorName: string | null;
  year: number;
  quota: number | null;
  degreeLevel: string | null;
  trainingType: string | null;
  note: string | null;
  sourceUrl: string | null;
};

export type AdmissionData = {
  schoolCode: string;
  schoolName: string | null;
  year: number | null;
  admissionInfo: {
    totalQuota: number | null;
    admissionScope: string | null;
    applicationTimeline: string | null;
    eligibility: string | null;
    notes: string | null;
    sourceUrl: string | null;
  } | null;
  methods: {
    methodCode: string;
    methodName: string;
    year: number;
    description: string | null;
    isActive: boolean | null;
    sourceUrl: string | null;
  }[];
  programs: MajorProfile[];
};

export type BenchmarkScore = {
  id: string;
  schoolCode: string;
  schoolName: string | null;
  programId: string | null;
  programCode: string | null;
  programName: string | null;
  majorName: string | null;
  year: number;
  methodCode: string;
  combinationCode: string | null;
  score: number;
  scale: number | null;
  note: string | null;
  sourceUrl: string | null;
};

export type TuitionData = {
  id: string;
  schoolCode: string;
  schoolName: string | null;
  programId: string | null;
  programCode: string | null;
  programName: string | null;
  majorName: string | null;
  year: number;
  minFee: number | null;
  maxFee: number | null;
  currency: string | null;
  unit: string | null;
  description: string | null;
  note: string | null;
  sourceUrl: string | null;
};

export type ScoreMajorSuggestion = {
  schoolCode: string;
  schoolName: string | null;
  city: string | null;
  programId: string | null;
  programCode: string | null;
  programName: string | null;
  majorName: string | null;
  year: number;
  methodCode: string;
  combinationCode: string | null;
  benchmarkScore: number;
  scoreGap: number;
  sourceUrl: string | null;
};

export type GetSchoolProfileParams = {
  schoolName?: string;
  schoolCode?: string;
};

export type GetMajorProfileParams = {
  majorName?: string;
  programCode?: string;
  schoolName?: string;
  schoolCode?: string;
};

export type GetAdmissionDataParams = {
  schoolName?: string;
  schoolCode?: string;
  programCode?: string;
  majorName?: string;
  year?: number;
};

export type GetBenchmarkScoresParams = GetAdmissionDataParams;

export type GetTuitionDataParams = GetAdmissionDataParams;

export type SuggestMajorsByScoreParams = {
  score: number;
  combination?: string;
  region?: string;
  interest?: string;
};
