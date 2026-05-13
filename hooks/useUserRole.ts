"use client";

import { useEffect, useState } from "react";

import { supabase } from "@/app/lib/supabase";
import type { UserRole } from "@/lib/auth-roles";

export function useUserRole() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function loadRole() {
      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;

        if (!token) {
          if (isActive) setRole(null);
          return;
        }

        const res = await fetch("/api/auth/role", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          if (isActive) setRole(null);
          return;
        }

        const json = (await res.json()) as { role?: UserRole };
        if (isActive) setRole(json.role ?? null);
      } catch (error) {
        console.error("Cannot load user role:", error);
        if (isActive) setRole(null);
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    loadRole();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      setIsLoading(true);
      loadRole();
    });

    return () => {
      isActive = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return {
    role,
    isAdmin: role === "admin",
    isLoading,
  };
}
