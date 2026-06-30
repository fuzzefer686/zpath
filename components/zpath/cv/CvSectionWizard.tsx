"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, SkipForward, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

// One navigable block of the CV builder. `content` is the fully-composed
// section card (SectionWrapper + its rows), built by the parent.
export interface WizardStep {
  key: string;
  title: string;
  icon?: React.ReactNode;
  content: React.ReactNode;
}

interface CvSectionWizardProps {
  steps: WizardStep[];
}

/**
 * Step-by-step CV builder. Shows ONE block at a time (not side-by-side
 * columns), with a progress rail, Back / Skip / Continue controls, and a
 * completion state. "Skip" is navigation-only: it just advances to the next
 * block and never changes what ends up on the CV.
 */
export function CvSectionWizard({ steps }: CvSectionWizardProps) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [done, setDone] = useState(false);

  const total = steps.length;
  if (total === 0) return null;

  const safeIndex = Math.min(index, total - 1);
  const current = steps[safeIndex];
  const isFirst = safeIndex === 0;
  const isLast = safeIndex === total - 1;
  const percent = Math.round(((safeIndex + 1) / total) * 100);

  const goTo = (next: number) => {
    const clamped = Math.max(0, Math.min(total - 1, next));
    setDirection(clamped >= safeIndex ? 1 : -1);
    setIndex(clamped);
  };

  // Both "Continue" and "Skip" advance; on the last block they finish.
  const advance = () => {
    if (isLast) {
      setDone(true);
      return;
    }
    goTo(safeIndex + 1);
  };

  const restart = () => {
    setDone(false);
    setDirection(-1);
    setIndex(0);
  };

  const slide = {
    enter: (dir: number) => ({ opacity: 0, x: reduce ? 0 : dir * 36 }),
    center: { opacity: 1, x: 0 },
    exit: (dir: number) => ({ opacity: 0, x: reduce ? 0 : dir * -36 }),
  };

  if (done) {
    return (
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-white/20 bg-white/60 p-8 text-center shadow-glow backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/60"
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
          <Check className="h-7 w-7" />
        </div>
        <h3 className="font-display text-xl font-bold tracking-tight text-foreground">
          Bạn đã đi qua tất cả các mục
        </h3>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
          Mọi thay đổi đã được lưu tự động. Bạn có thể xem lại từ đầu hoặc xuất bản CV ở phần phía trên.
        </p>
        <Button
          onClick={restart}
          variant="outline"
          className="mt-6 gap-1.5 rounded-xl border-primary/20 hover:bg-primary/5 hover:text-primary"
        >
          <RotateCcw className="h-4 w-4" /> Xem lại từ đầu
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress rail */}
      <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-white/60 p-5 shadow-glow backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/60">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
              Bước {safeIndex + 1}/{total}
            </span>
            <h3 className="truncate font-display text-base font-bold tracking-tight text-foreground">
              {current.title}
            </h3>
          </div>
          <span className="shrink-0 text-xs font-semibold text-muted-foreground">
            {percent}% hoàn thành
          </span>
        </div>

        {/* Clickable step segments — also act as a progress bar */}
        <div className="mt-4 flex gap-1.5">
          {steps.map((s, i) => {
            const reached = i <= safeIndex;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Đi tới: ${s.title}`}
                aria-current={i === safeIndex ? "step" : undefined}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  reached
                    ? "bg-gradient-to-r from-indigo-500 to-blue-600"
                    : "bg-muted/60 hover:bg-muted"
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Active block — one at a time, full width */}
      <div className="relative">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={current.key}
            custom={direction}
            variants={slide}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            {current.content}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          disabled={isFirst}
          onClick={() => goTo(safeIndex - 1)}
          className="gap-1.5 rounded-xl text-muted-foreground hover:text-foreground disabled:opacity-40"
        >
          <ArrowLeft className="h-4 w-4" /> Quay lại
        </Button>

        <div className="flex items-center gap-2">
          {!isLast && (
            <Button
              type="button"
              variant="ghost"
              onClick={advance}
              className="gap-1.5 rounded-xl text-muted-foreground hover:text-foreground"
            >
              <SkipForward className="h-4 w-4" /> Bỏ qua
            </Button>
          )}
          <Button
            type="button"
            variant="hero"
            onClick={advance}
            className="gap-1.5 rounded-xl px-6 shadow-glow"
          >
            {isLast ? "Hoàn tất" : "Tiếp tục"}
            {isLast ? <Check className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
