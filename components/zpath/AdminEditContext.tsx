"use client";

import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/app/lib/supabase";

type EditableValue = string | number | boolean | null;
type EditableTable = "universities" | "majors" | "programs";

export interface PendingChange {
  table: EditableTable;
  id: string; // The primary key (could be code or id)
  field: string;
  value: EditableValue;
}

interface AdminEditContextType {
  isAdmin: boolean;
  isEditMode: boolean;
  setIsEditMode: (v: boolean) => void;
  pendingChanges: PendingChange[];
  registerChange: (change: PendingChange) => void;
  commitChanges: () => Promise<void>;
  discardChanges: () => void;
}

const AdminEditContext = createContext<AdminEditContextType | null>(null);

export function AdminEditProvider({
  children,
  isAdmin,
}: {
  children: ReactNode;
  isAdmin: boolean;
}) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);

  const registerChange = useCallback((change: PendingChange) => {
    setPendingChanges((prev) => {
      // If the field was already changed, update the latest value
      const existingIdx = prev.findIndex(
        (c) => c.table === change.table && c.id === change.id && c.field === change.field
      );
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = change;
        return next;
      }
      return [...prev, change];
    });
  }, []);

  const commitChanges = async () => {
    if (pendingChanges.length === 0) return;

    // Group changes by table and id
    // { "universities": { "HUST": { about: "...", city: "..." } } }
    const grouped: Record<EditableTable, Record<string, Record<string, EditableValue>>> = {
      universities: {},
      majors: {},
      programs: {},
    };

    for (const change of pendingChanges) {
      if (!grouped[change.table]) grouped[change.table] = {};
      if (!grouped[change.table][change.id]) grouped[change.table][change.id] = {};
      grouped[change.table][change.id][change.field] = change.value;
    }

    try {
      // Execute all updates
      for (const [table, rows] of Object.entries(grouped)) {
        for (const [id, fields] of Object.entries(rows)) {
          // Assuming 'code' is the PK for universities and majors, but 'id' for programs.
          // In our DB schema, let's ensure we use 'code' for universities/majors to make it easy.
          const pkField = table === "programs" ? "id" : "code";

          const { error } = await supabase
            .from(table)
            .update(fields)
            .eq(pkField, id);

          if (error) throw error;
        }
      }

      setPendingChanges([]);
    } catch (error) {
      console.error("Lỗi khi lưu thay đổi:", error);
      throw error;
    }
  };

  const discardChanges = useCallback(() => {
    setPendingChanges([]);
  }, []);

  return (
    <AdminEditContext.Provider
      value={{
        isAdmin,
        isEditMode,
        setIsEditMode,
        pendingChanges,
        registerChange,
        commitChanges,
        discardChanges,
      }}
    >
      {children}
    </AdminEditContext.Provider>
  );
}

export function useAdminEdit() {
  const ctx = useContext(AdminEditContext);
  if (!ctx) {
    return {
      isAdmin: false,
      isEditMode: false,
      setIsEditMode: () => {},
      pendingChanges: [],
      registerChange: () => {},
      commitChanges: async () => {},
      discardChanges: () => {},
    };
  }
  return ctx;
}
