"use client";

import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SectionWrapperProps {
  title: string;
  description?: string;
  icon: React.ReactNode;
  onAdd?: () => void;
  children: React.ReactNode;
}

export function SectionWrapper({
  title,
  description,
  icon,
  onAdd,
  children,
}: SectionWrapperProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="relative overflow-hidden rounded-2xl border border-white/20 bg-white/60 p-6 shadow-glow backdrop-blur-xl transition hover:shadow-lg dark:border-white/10 dark:bg-zinc-900/60"
    >
      {/* Decorative gradient border top */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-muted/55 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/20">
            {icon}
          </div>
          <div>
            <h3 className="font-display text-lg font-bold tracking-tight text-foreground">
              {title}
            </h3>
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {description}
              </p>
            )}
          </div>
        </div>

        {onAdd && (
          <Button
            onClick={onAdd}
            variant="outline"
            size="sm"
            className="self-start sm:self-auto rounded-xl border-primary/20 hover:bg-primary/5 hover:text-primary gap-1 px-3.5 py-2 text-xs font-semibold"
          >
            <Plus className="h-3.5 w-3.5" /> Thêm mới
          </Button>
        )}
      </div>

      <div className="space-y-4">{children}</div>
    </motion.div>
  );
}
