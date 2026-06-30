"use client";

import { useState, useEffect } from "react";
import { Reorder, motion, AnimatePresence } from "framer-motion";
import { GripVertical, Eye, EyeOff, Settings, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

interface LayoutManagerProps {
  order: string[];
  visibility: Record<string, boolean>;
  onSave: (config: { order: string[]; visibility: Record<string, boolean> }) => Promise<void>;
}

const SECTION_LABELS: Record<string, string> = {
  basic: "1. Thông tin cơ bản",
  summary: "2. Tóm tắt & Mục tiêu",
  education: "3. Trình độ học vấn & Học bạ",
  experience_skills: "4. Kinh nghiệm & Kỹ năng",
  certs_awards: "5. Chứng chỉ & Giải thưởng",
  activities: "6. Hoạt động ngoại khóa",
  personality: "7. Kết quả trắc nghiệm tính cách",
};

export function LayoutManager({ order, visibility, onSave }: LayoutManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<string[]>(order);
  const [visMap, setVisMap] = useState<Record<string, boolean>>(visibility);
  const [isSaving, setIsSaving] = useState(false);

  // Sync state with props
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(order);
    setVisMap(visibility);
  }, [order, visibility]);

  const handleReorder = async (newOrder: string[]) => {
    setItems(newOrder);
    setIsSaving(true);
    try {
      await onSave({ order: newOrder, visibility: visMap });
    } catch (error) {
      console.error("Auto-save order error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleVisibility = async (key: string) => {
    const nextVis = { ...visMap, [key]: !visMap[key] };
    setVisMap(nextVis);
    setIsSaving(true);
    try {
      await onSave({ order: items, visibility: nextVis });
    } catch (error) {
      console.error("Auto-save visibility error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/20 bg-white/60 shadow-glow backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/60 overflow-hidden">
      {/* Accordion Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 font-display text-sm font-bold text-foreground hover:bg-muted/30 transition outline-none"
      >
        <div className="flex items-center gap-2">
          <Settings className="h-4.5 w-4.5 text-primary animate-spin-slow" />
          <span>Cấu hình bố cục CV ({items.length} Khối)</span>
          {isSaving && (
            <span className="inline-flex items-center gap-1 text-[10px] font-normal text-muted-foreground ml-2">
              <Loader2 className="h-3 w-3 animate-spin text-primary" /> Đang lưu...
            </span>
          )}
        </div>
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {/* Accordion Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden border-t border-muted/50"
          >
            <div className="p-4 bg-muted/10 space-y-3">
              <p className="text-xs text-muted-foreground mb-4">
                Kéo thả các biểu tượng <GripVertical className="inline h-3.5 w-3.5" /> để thay đổi thứ tự hiển thị, hoặc bấm biểu tượng mắt để ẩn/hiện khối trên bản xuất CV/preview.
              </p>

              <Reorder.Group
                axis="y"
                values={items}
                onReorder={handleReorder}
                className="space-y-2.5"
              >
                {items.map((key) => {
                  const isVisible = visMap[key] !== false;
                  return (
                    <Reorder.Item
                      key={key}
                      value={key}
                      className="flex items-center justify-between bg-white dark:bg-zinc-850 p-3 rounded-xl border border-muted/55 shadow-sm cursor-grab active:cursor-grabbing hover:border-primary/30 transition select-none"
                    >
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-xs font-bold text-foreground">
                          {SECTION_LABELS[key] || key}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleVisibility(key)}
                          className={`p-1.5 rounded-lg border transition ${
                            isVisible
                              ? "bg-primary/5 border-primary/20 text-primary hover:bg-primary/10"
                              : "bg-muted/40 border-muted text-muted-foreground hover:bg-muted/65"
                          }`}
                          title={isVisible ? "Đang hiện trên CV" : "Đang ẩn khỏi CV"}
                        >
                          {isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </button>
                      </div>
                    </Reorder.Item>
                  );
                })}
              </Reorder.Group>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
