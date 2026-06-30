"use client";

import { useState, useEffect, useCallback } from "react";

export type CvProfile = {
  user_id: string;
  full_name: string | null;
  date_of_birth: string | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  avatar_url: string | null;
  headline: string | null;
  summary: string | null;
  target_major_code: string | null;
  target_career: string | null;
  sections_config: {
    order: string[];
    visibility: Record<string, boolean>;
  };
  completeness_score: number;
};

export type CvEducation = {
  id?: string;
  user_id?: string;
  level: string;
  school_name: string;
  school_code?: string | null;
  gpa?: number | null;
  grade_10?: number | null;
  grade_11?: number | null;
  grade_12?: number | null;
  subjects?: Record<string, number> | null;
  start_year?: number | null;
  end_year?: number | null;
  is_current?: boolean;
  linked_transcript_id?: string | null;
};

export type CvExperience = {
  id?: string;
  user_id?: string;
  type: "work" | "volunteer" | "project" | "internship" | "competition" | "other";
  title: string;
  organization?: string | null;
  description?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_current?: boolean;
  sort_order?: number;
};

export type CvSkill = {
  id?: string;
  user_id?: string;
  name: string;
  category: "technical" | "soft" | "language" | "tool" | "other";
  proficiency: number;
  source: string;
  is_confirmed: boolean;
};

export type CvCertificate = {
  id?: string;
  user_id?: string;
  cert_type_code: string;
  score: string;
  issued_date?: string | null;
  expiry_date?: string | null;
  evidence_url?: string | null;
  is_verified?: boolean;
};

export type CvAward = {
  id?: string;
  user_id?: string;
  title: string;
  level: "school" | "district" | "province" | "national" | "international";
  rank?: string | null;
  issuer?: string | null;
  award_year?: number | null;
  evidence_url?: string | null;
};

export type CvActivity = {
  id?: string;
  user_id?: string;
  title: string;
  role?: string | null;
  organization?: string | null;
  description?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  hours?: number | null;
  sort_order?: number;
};

export type CvData = {
  profile: CvProfile | null;
  education: CvEducation[];
  experiences: CvExperience[];
  skills: CvSkill[];
  certificates: CvCertificate[];
  awards: CvAward[];
  activities: CvActivity[];
};

export function useCvData() {
  const [data, setData] = useState<CvData>({
    profile: null,
    education: [],
    experiences: [],
    skills: [],
    certificates: [],
    awards: [],
    activities: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCvData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/profile/cv");
      if (!response.ok) {
        throw new Error("Không thể tải dữ liệu hồ sơ CV.");
      }
      const json = await response.json();
      setData(json);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Có lỗi xảy ra khi tải dữ liệu CV.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const mutate = useCallback(async (action: string, payload: any) => {
    setError(null);
    try {
      const response = await fetch("/api/profile/cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, data: payload }),
      });

      const res = await response.json();
      if (!response.ok || res.error) {
        throw new Error(res.error || "Giao dịch thất bại.");
      }

      // Re-fetch CV data for consistency; the GET handler recomputes and
      // persists the completeness score, so the fresh value comes back here.
      await fetchCvData();
      return res;
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Lỗi cập nhật dữ liệu.");
      throw err;
    }
  }, [fetchCvData]);

  useEffect(() => {
    fetchCvData();
  }, [fetchCvData]);

  return {
    data,
    isLoading,
    error,
    mutate,
    refresh: fetchCvData,
  };
}
