"use client";

interface InlineEditableProps {
  value: string;
  as?: React.ElementType;
  className?: string;
  [key: string]: any;
}

export function InlineEditable({
  value,
  as: Component = "span",
  className = "",
}: InlineEditableProps) {
  return <Component className={className}>{value}</Component>;
}
