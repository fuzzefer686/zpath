"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/zpath/AuthProvider";

export type ProfileData = {
  display_name: string;
  avatar_url: string;
  bio: string;
  school: string;
  grade: string;
  target_university: string;
  role: "admin" | "user";
  email: string;
  username: string;
  sbti?: string | null;
  score_math?: number | null;
  score_literature?: number | null;
};

export function useProfile() {
  const { user, isLoading: authLoading } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/profile");
      if (!response.ok) {
        throw new Error("Không thể lấy thông tin cá nhân.");
      }
      const data = await response.json();
      setProfile(data);
    } catch (err) {
      console.error("fetchProfile error:", err);
      setError(err instanceof Error ? err.message : "Đã xảy ra lỗi.");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      void fetchProfile();
    }
  }, [authLoading, fetchProfile]);

  const updateProfile = useCallback(async (data: Partial<ProfileData>) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Không thể cập nhật thông tin cá nhân.");
      }

      const updated = await response.json();
      setProfile(updated);
      return updated;
    } catch (err) {
      console.error("updateProfile error:", err);
      const errMsg = err instanceof Error ? err.message : "Đã xảy ra lỗi.";
      setError(errMsg);
      throw new Error(errMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const uploadAvatar = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const response = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Không thể tải lên ảnh đại diện.");
      }

      const resData = await response.json();
      
      // Update local profile state with new avatar url
      setProfile((prev) => prev ? { ...prev, avatar_url: resData.avatar_url } : null);
      
      return resData.avatar_url;
    } catch (err) {
      console.error("uploadAvatar error:", err);
      const errMsg = err instanceof Error ? err.message : "Đã xảy ra lỗi.";
      setError(errMsg);
      throw new Error(errMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    profile,
    isLoading: authLoading || isLoading,
    error,
    updateProfile,
    uploadAvatar,
    reloadProfile: fetchProfile,
  };
}
