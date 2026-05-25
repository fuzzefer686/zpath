"use client";

import { useMemo } from "react";

import { useAuth } from "@/components/zpath/AuthProvider";
import type { UserProfile } from "@/lib/types";

const guestProfile: UserProfile = {
  email: "guest@zpath.local",
  personality: "ZPath",
  scores: {
    math: 6.5,
    physics: 6.5,
    third: 6.5,
    total: 19.5,
  },
  updatedAt: null,
};

export const useUserProfile = () => {
  const { user, isLoading: authLoading, reloadAuth } = useAuth();
  const userProfile = useMemo<UserProfile>(() => {
    if (!user) return guestProfile;

    return {
      ...guestProfile,
      email: user.username,
    };
  }, [user]);

  return {
    user,
    userProfile,
    isLoading: authLoading,
    errorMessage: null,
    reloadProfile: async () => {
      await reloadAuth();
    },
    openAuthPrompt: () => {},
  };
};
