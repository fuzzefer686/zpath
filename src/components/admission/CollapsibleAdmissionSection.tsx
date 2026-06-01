"use client";

import { useEffect, useState, type ReactNode } from "react";
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
  defaultOpen = false,
  children,
}: CollapsibleAdmissionSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  useEffect(() => {
    function openWhenTargeted(targetId: string) {
      if (targetId === id) {
        setIsOpen(true);
      }
    }

    function handleHashChange() {
      openWhenTargeted(window.location.hash.slice(1));
    }

    function handleNavigatorClick(event: Event) {
      const targetId = (event as CustomEvent<{ id?: string }>).detail?.id;
      if (targetId) {
        openWhenTargeted(targetId);
      }
    }

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    window.addEventListener("admission-section:navigate", handleNavigatorClick);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
      window.removeEventListener("admission-section:navigate", handleNavigatorClick);
    };
  }, [id]);

  return (
    <section id={id} className="scroll-mt-24">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-controls={`${id}-content`}
        className={`group flex w-full overflow-hidden rounded-xl border text-left shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          isOpen
            ? "border-primary/30 bg-primary/[0.04]"
            : "border-border bg-card hover:border-primary/30 hover:bg-muted/40"
        }`}
      >
        <span
          className={`w-1 shrink-0 transition-colors ${
            isOpen ? "bg-primary" : "bg-border group-hover:bg-primary/50"
          }`}
          aria-hidden="true"
        />
        <span className="flex min-h-14 flex-1 items-center justify-between gap-4 px-4 py-3">
          <span className="min-w-0 font-display text-lg font-bold leading-6 text-foreground">
            {title}
          </span>
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
              isOpen
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
            }`}
            aria-hidden="true"
          >
            <ChevronDown
              className={`h-5 w-5 transition-transform ${isOpen ? "rotate-180" : ""}`}
            />
          </span>
        </span>
      </button>

      {isOpen ? (
        <div id={`${id}-content`} className="mt-4 space-y-4">
          {children}
        </div>
      ) : null}
    </section>
  );
}
