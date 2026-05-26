"use client";

import { useAuth } from "@/components/zpath/AuthProvider";

export function useUserRole() {
  const { user, isLoading } = useAuth();

  return {
    role: user?.role ?? null,
    isAdmin: user?.role === "admin",
    isLoading,
  };
}
