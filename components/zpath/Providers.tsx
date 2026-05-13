"use client";

import { ReactNode } from "react";
import { AdminEditProvider } from "./AdminEditContext";
import { useUserRole } from "@/hooks/useUserRole";

export function Providers({ children }: { children: ReactNode }) {
  const { isAdmin } = useUserRole();

  return (
    <AdminEditProvider isAdmin={isAdmin}>
      {children}
    </AdminEditProvider>
  );
}
