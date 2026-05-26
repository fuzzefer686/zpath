"use client";

import { ReactNode } from "react";
import { AdminEditProvider } from "./AdminEditContext";
import { AuthProvider, useAuth } from "./AuthProvider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ProvidersWithAuth>{children}</ProvidersWithAuth>
    </AuthProvider>
  );
}

function ProvidersWithAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  return (
    <AdminEditProvider isAdmin={user?.role === "admin"}>
      {children}
    </AdminEditProvider>
  );
}
