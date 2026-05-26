"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

type CollapsibleAdmissionSectionProps = {
  id: string;
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

export function CollapsibleAdmissionSection({
  id,
  title,
  defaultOpen = true,
  children,
}: CollapsibleAdmissionSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section id={id} className="scroll-mt-24">
      <div className="mb-3 flex items-center justify-between border-b border-border pb-2">
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          aria-expanded={isOpen}
          aria-controls={`${id}-content`}
          className="flex min-h-10 w-full items-center justify-between gap-3 text-left font-display text-lg font-bold text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span>{title}</span>
          <ChevronDown
            className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
            aria-hidden="true"
          />
        </button>
      </div>

      {isOpen ? (
        <div id={`${id}-content`} className="space-y-4">
          {children}
        </div>
      ) : null}
    </section>
  );
}
