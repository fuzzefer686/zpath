"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CvResultsModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  /** Pending count shown as a badge next to the title. */
  count?: number;
  children: React.ReactNode;
}

/**
 * Bottom-sheet (mobile) / centered (desktop) modal for AI result lists.
 * Keeps long result lists OFF the page — the list scrolls inside the popup so
 * the trigger panels stay compact. Mirrors the ItemDialog overlay idiom.
 */
export function CvResultsModal({ open, onClose, title, subtitle, icon, count, children }: CvResultsModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 20 }}
            className="relative flex max-h-[85vh] w-full flex-col rounded-t-3xl border-t border-white/20 bg-white shadow-2xl backdrop-blur-xl sm:max-h-[80vh] sm:max-w-lg sm:rounded-2xl sm:border dark:border-zinc-800 dark:bg-zinc-900"
          >
            {/* Header (sticky) */}
            <div className="flex items-center justify-between gap-3 border-b border-muted/55 px-5 py-4">
              <div className="flex min-w-0 items-center gap-2.5">
                {icon && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/20">
                    {icon}
                  </div>
                )}
                <h3 className="truncate font-display text-base font-bold text-foreground">{title}</h3>
                {typeof count === "number" && count > 0 && (
                  <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                    {count}
                  </span>
                )}
              </div>
              <Button onClick={onClose} variant="ghost" size="sm" className="h-8 w-8 shrink-0 rounded-full p-0 hover:bg-muted">
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Scrollable body */}
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {subtitle && <p className="mb-3 text-xs text-muted-foreground">{subtitle}</p>}
              <div className="space-y-2 pb-[max(env(safe-area-inset-bottom),1rem)]">{children}</div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
