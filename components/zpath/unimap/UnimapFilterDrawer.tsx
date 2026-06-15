"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { SlidersHorizontal, X } from "lucide-react";

import type { FilterGroup, UnimapFacets } from "@/hooks/useUnimapFilters";
import { UnimapFilterPanel } from "./UnimapFilterPanel";

interface UnimapFilterDrawerProps {
  open: boolean;
  onClose: () => void;
  facets: UnimapFacets;
  selected: Record<FilterGroup, string[]>;
  onToggle: (group: FilterGroup, value: string) => void;
  onReset: () => void;
  resultCount: number;
  activeCount: number;
}

export function UnimapFilterDrawer({
  open,
  onClose,
  facets,
  selected,
  onToggle,
  onReset,
  resultCount,
  activeCount,
}: UnimapFilterDrawerProps) {
  const reduceMotion = useReducedMotion();

  // Lock body scroll while the sheet is open.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Close on Escape for keyboard users.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <motion.div
            className="absolute inset-0 bg-foreground/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Bộ lọc trường"
            className="absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col rounded-t-3xl border-t border-border bg-background shadow-2xl"
            initial={reduceMotion ? { opacity: 0 } : { y: "100%" }}
            animate={reduceMotion ? { opacity: 1 } : { y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { y: "100%" }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="inline-flex items-center gap-2 font-display text-lg font-bold">
                <SlidersHorizontal className="h-5 w-5 text-primary" />
                Bộ lọc
                {activeCount > 0 ? (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                    {activeCount}
                  </span>
                ) : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Đóng bộ lọc"
                className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              <UnimapFilterPanel facets={facets} selected={selected} onToggle={onToggle} />
            </div>

            <div className="flex items-center gap-3 border-t border-border px-5 py-4">
              <button
                type="button"
                onClick={onReset}
                className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                Đặt lại
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-transform active:scale-[0.98]"
              >
                Xem {resultCount} trường
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
