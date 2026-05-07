'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { getCurrentUserProfile } from "@/lib/profile";
import type { UserProfile } from "@/lib/types";

export const useUserProfile = (options?: { requireAuth?: boolean }) => {
  const router = useRouter();
  const requireAuth = options?.requireAuth ?? true;

  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resetState = useMemo(
    () => () => {
      setGoogleUser(null);
      setUserProfile(null);
      setErrorMessage(null);
      setIsLoading(true);
    },
    []
  );

  const loadProfile = useCallback(async () => {
    resetState();

    try {
      const { user, profile } = await getCurrentUserProfile();

      if (!user) {
        if (requireAuth) {
          router.push("/login");
        }

        setGoogleUser(null);
        setUserProfile(null);
        return;
      }

      setGoogleUser(user);
      setUserProfile(profile);
    } catch (error) {
      console.error("Khong the tai ho so nguoi dung:", error);
      setErrorMessage("Khong the tai ho so cua ban luc nay.");
    } finally {
      setIsLoading(false);
    }
  }, [requireAuth, resetState, router]);

  useEffect(() => {
    let isActive = true;

    getCurrentUserProfile()
      .then(({ user, profile }) => {
        if (!isActive) {
          return;
        }

        if (!user) {
          if (requireAuth) {
            router.push("/login");
          }

          setGoogleUser(null);
          setUserProfile(null);
          setIsLoading(false);
          return;
        }

        setGoogleUser(user);
        setUserProfile(profile);
        setIsLoading(false);
      })
      .catch((error) => {
        if (!isActive) {
          return;
        }

        console.error("Khong the tai ho so nguoi dung:", error);
        setErrorMessage("Khong the tai ho so cua ban luc nay.");
        setIsLoading(false);
      })
      .finally(() => {});

    return () => {
      isActive = false;
    };
  }, [requireAuth, resetState, router]);

  return {
    googleUser,
    userProfile,
    isLoading,
    errorMessage,
    reloadProfile: loadProfile,
  };
};
