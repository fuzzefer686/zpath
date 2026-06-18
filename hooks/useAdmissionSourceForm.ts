"use client";

import { useCallback, useMemo, useState } from "react";

export type AdmissionSourceInputType = "url" | "file_url" | "text";
export type AdmissionSourceRole = "primary" | "supplement";

export type AdmissionSourceItem = {
  id: string;
  type: Exclude<AdmissionSourceInputType, "text">;
  value: string;
  label: string;
  role: AdmissionSourceRole;
};

export type AdmissionSourcePayload = {
  type: AdmissionSourceInputType;
  value: string;
  label?: string;
  role?: AdmissionSourceRole;
};

function createSourceId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createEmptySource(): AdmissionSourceItem {
  return {
    id: createSourceId(),
    type: "url",
    value: "",
    label: "",
    role: "primary",
  };
}

export function useAdmissionSourceForm() {
  const [sources, setSources] = useState<AdmissionSourceItem[]>([createEmptySource()]);
  const [pastedText, setPastedText] = useState("");

  const addSource = useCallback(() => {
    setSources((current) => [...current, createEmptySource()]);
  }, []);

  const removeSource = useCallback((id: string) => {
    setSources((current) => {
      if (current.length === 1) {
        return [{ ...current[0], value: "", label: "" }];
      }
      return current.filter((item) => item.id !== id);
    });
  }, []);

  const updateSource = useCallback(
    <K extends keyof AdmissionSourceItem>(
      id: string,
      key: K,
      value: AdmissionSourceItem[K],
    ) => {
      setSources((current) =>
        current.map((item) => (item.id === id ? { ...item, [key]: value } : item)),
      );
    },
    [],
  );

  const buildPayload = useCallback((): AdmissionSourcePayload[] => {
    const payload: AdmissionSourcePayload[] = sources
      .map((item) => ({
        type: item.type,
        value: item.value.trim(),
        label: item.label.trim() || undefined,
        role: item.role,
      }))
      .filter((item) => item.value.length > 0);

    const normalizedText = pastedText.trim();
    if (normalizedText) {
      payload.push({
        type: "text",
        value: normalizedText,
        label: "Nội dung dán tay",
        role: "supplement",
      });
    }

    return payload;
  }, [pastedText, sources]);

  const hasAnyInput = useMemo(() => {
    if (pastedText.trim()) return true;
    return sources.some((source) => source.value.trim().length > 0);
  }, [pastedText, sources]);

  return {
    sources,
    pastedText,
    setPastedText,
    addSource,
    removeSource,
    updateSource,
    buildPayload,
    hasAnyInput,
  };
}
