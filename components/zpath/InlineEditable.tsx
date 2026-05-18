"use client";

import { useRef } from "react";
import { useAdminEdit } from "./AdminEditContext";

interface InlineEditableProps {
  table: "universities" | "majors" | "programs";
  id: string; // The row identifier (e.g. "HUST" or "cntt")
  field: string;
  value: string;
  as?: React.ElementType;
  className?: string;
  multiline?: boolean;
}

export function InlineEditable({
  table,
  id,
  field,
  value: initialValue,
  as: Component = "span",
  className = "",
  multiline = false,
}: InlineEditableProps) {
  const { isEditMode, registerChange, pendingChanges } = useAdminEdit();
  
  // Try to get value from pending changes, otherwise use initialValue
  const pendingChange = pendingChanges.find((c) => c.table === table && c.id === id && c.field === field);
  const displayValue = pendingChange ? pendingChange.value : initialValue;

  const elementRef = useRef<HTMLElement>(null);

  if (!isEditMode) {
    return <Component className={className}>{displayValue}</Component>;
  }

  const handleBlur = (event: React.FocusEvent<HTMLElement>) => {
    const localValue = event.currentTarget.innerText || "";
    if (localValue !== initialValue) {
      registerChange({ table, id, field, value: localValue });
    }
  };

  return (
    <Component
      ref={elementRef}
      contentEditable
      suppressContentEditableWarning
      onBlur={handleBlur}
      className={`outline-none transition-all duration-200 hover:ring-2 hover:ring-primary/50 focus:ring-2 focus:ring-primary focus:bg-primary/5 rounded-sm px-1 -mx-1 cursor-text ${multiline ? "whitespace-pre-wrap" : ""} ${className}`}
      style={{ minWidth: "20px", display: "inline-block" }}
    >
      {displayValue}
    </Component>
  );
}
