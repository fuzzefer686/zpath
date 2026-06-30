"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown, ChevronUp, Eye, Loader2, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface CvTemplate {
  id: string;
  slug: string;
  name: string;
  layout_config: {
    themeColor?: string;
    accentColor?: string;
    fontFamily?: string;
    archetype?: string;
  };
  preview_image_url?: string | null;
}

interface TemplatePickerProps {
  selectedTemplateId: string | null;
  onSelect: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Archetype wireframe SVGs — simple visual hint for each layout type.
// Colors are supplied by the parent (themeColor from layout_config).
// ---------------------------------------------------------------------------
function ArchetypeIcon({ archetype, color }: { archetype: string; color: string }) {
  const light = color + "40"; // 25% alpha for tint lines
  switch (archetype) {
    case "two_column":
      return (
        <svg viewBox="0 0 56 40" className="w-full h-full">
          <rect x="1" y="1" width="16" height="38" rx="2" fill={light} stroke={color} strokeWidth="0.8" />
          <rect x="20" y="1" width="35" height="38" rx="2" fill={light} stroke={color} strokeWidth="0.8" />
          <rect x="3" y="4" width="12" height="4" rx="1" fill={color} opacity="0.7" />
          {[10, 16, 22, 28].map((y) => (
            <rect key={y} x="3" y={y} width="12" height="2" rx="0.5" fill={color} opacity="0.35" />
          ))}
          <rect x="22" y="4" width="31" height="5" rx="1" fill={color} opacity="0.7" />
          {[12, 18, 24, 30].map((y) => (
            <rect key={y} x="22" y={y} width="31" height="2" rx="0.5" fill={color} opacity="0.35" />
          ))}
        </svg>
      );
    case "sidebar":
      return (
        <svg viewBox="0 0 56 40" className="w-full h-full">
          <rect x="1" y="1" width="15" height="38" rx="2" fill={color} opacity="0.85" />
          <rect x="19" y="1" width="36" height="38" rx="2" fill={light} stroke={color} strokeWidth="0.8" />
          <circle cx="8.5" cy="8" r="4" fill="white" opacity="0.8" />
          {[14, 20, 26, 32].map((y) => (
            <rect key={y} x="3" y={y} width="10" height="2" rx="0.5" fill="white" opacity="0.6" />
          ))}
          <rect x="21" y="4" width="32" height="5" rx="1" fill={color} opacity="0.6" />
          {[12, 18, 24, 30].map((y) => (
            <rect key={y} x="21" y={y} width="32" height="2" rx="0.5" fill={color} opacity="0.3" />
          ))}
        </svg>
      );
    case "modern":
      return (
        <svg viewBox="0 0 56 40" className="w-full h-full">
          <rect x="1" y="1" width="54" height="14" rx="2" fill={color} />
          <rect x="4" y="4" width="28" height="4" rx="1" fill="white" opacity="0.85" />
          <rect x="4" y="10" width="18" height="2.5" rx="1" fill="white" opacity="0.6" />
          <rect x="1" y="17" width="54" height="22" rx="2" fill={light} stroke={color} strokeWidth="0.8" />
          <rect x="3" y="19" width="50" height="1.5" rx="0.5" fill={color} opacity="0.4" />
          {[23, 28, 33].map((y) => (
            <rect key={y} x="3" y={y} width="50" height="2" rx="0.5" fill={color} opacity="0.25" />
          ))}
        </svg>
      );
    default: // classic
      return (
        <svg viewBox="0 0 56 40" className="w-full h-full">
          <rect x="1" y="1" width="54" height="12" rx="2" fill={light} stroke={color} strokeWidth="0.8" />
          <circle cx="9" cy="7" r="4" fill={color} opacity="0.7" />
          <rect x="16" y="4" width="22" height="3" rx="1" fill={color} opacity="0.7" />
          <rect x="16" y="9" width="14" height="2" rx="0.5" fill={color} opacity="0.4" />
          <rect x="1" y="15" width="54" height="24" rx="2" fill={light} stroke={color} strokeWidth="0.8" />
          {[18, 22, 26, 30, 34].map((y) => (
            <rect key={y} x="3" y={y} width="50" height="2" rx="0.5" fill={color} opacity="0.3" />
          ))}
        </svg>
      );
  }
}

const ARCHETYPE_LABELS: Record<string, string> = {
  classic:    "1 cột",
  two_column: "2 cột",
  sidebar:    "Dải bên",
  modern:     "Header màu",
};

// ---------------------------------------------------------------------------
// TemplatePicker
// ---------------------------------------------------------------------------
export function TemplatePicker({ selectedTemplateId, onSelect }: TemplatePickerProps) {
  const [templates, setTemplates] = useState<CvTemplate[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const prevObjectUrl = useRef<string | null>(null);

  // Fetch templates once on first open.
  useEffect(() => {
    if (!isOpen || templates.length) return;
    setLoading(true);
    fetch("/api/cv/templates")
      .then((r) => r.json())
      .then((d) => setTemplates(d.templates ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen, templates.length]);

  // Clean up blob URL when component unmounts or URL changes.
  useEffect(() => {
    return () => { if (prevObjectUrl.current) URL.revokeObjectURL(prevObjectUrl.current); };
  }, []);

  const handlePreview = useCallback(async (templateId: string) => {
    setPreviewing(true);
    setPreviewUrl(null);
    try {
      const res = await fetch("/api/cv/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      if (prevObjectUrl.current) URL.revokeObjectURL(prevObjectUrl.current);
      const url = URL.createObjectURL(blob);
      prevObjectUrl.current = url;
      setPreviewUrl(url);
    } catch {
      // silently ignore — preview is best-effort
    } finally {
      setPreviewing(false);
    }
  }, []);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  return (
    <div className="rounded-2xl border border-white/20 bg-white/60 shadow-glow backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/60 overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 via-pink-500 to-orange-400 pointer-events-none" />

      {/* Accordion trigger */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center justify-between p-4 font-display text-sm font-bold text-foreground hover:bg-muted/30 transition outline-none"
      >
        <div className="flex items-center gap-2">
          <Palette className="h-4.5 w-4.5 text-primary" />
          <span>
            Chọn mẫu CV
            {selectedTemplate && (
              <span className="ml-2 font-normal text-muted-foreground">— {selectedTemplate.name}</span>
            )}
          </span>
        </div>
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
            className="overflow-hidden border-t border-muted/50"
          >
            <div className="p-4 bg-muted/10 space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" /> Đang tải danh sách mẫu…
                </div>
              ) : (
                <>
                  {/* Template grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {templates.map((t) => {
                      const color = t.layout_config?.themeColor ?? "#4F46E5";
                      const archetype = t.layout_config?.archetype ?? "classic";
                      const isSelected = t.id === selectedTemplateId;
                      return (
                        <button
                          key={t.id}
                          onClick={() => { onSelect(t.id); handlePreview(t.id); }}
                          className={`relative rounded-xl border-2 p-2 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                            isSelected
                              ? "border-primary shadow-md shadow-primary/20"
                              : "border-muted/50 hover:border-primary/40 hover:shadow-sm"
                          }`}
                        >
                          {/* Color swatch + wireframe */}
                          <div className="rounded-lg overflow-hidden mb-2 bg-white border border-muted/30" style={{ aspectRatio: "1.41/1" }}>
                            {t.preview_image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={t.preview_image_url} alt={t.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full p-1.5">
                                <ArchetypeIcon archetype={archetype} color={color} />
                              </div>
                            )}
                          </div>

                          {/* Name + archetype badge */}
                          <p className="text-[11px] font-semibold text-foreground truncate">{t.name}</p>
                          <span
                            className="inline-block mt-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white"
                            style={{ backgroundColor: color }}
                          >
                            {ARCHETYPE_LABELS[archetype] ?? archetype}
                          </span>

                          {/* Selected checkmark */}
                          {isSelected && (
                            <div className="absolute top-1.5 right-1.5 rounded-full bg-primary w-4 h-4 flex items-center justify-center">
                              <Check className="h-2.5 w-2.5 text-white" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Live preview */}
                  {(previewing || previewUrl) && (
                    <div className="rounded-xl border border-muted/50 overflow-hidden">
                      <div className="flex items-center gap-2 px-3 py-2 border-b border-muted/50 bg-muted/20">
                        <Eye className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-xs text-muted-foreground font-medium">Xem trước — bản PDF thật</span>
                        {previewing && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary ml-auto" />}
                      </div>
                      {previewUrl && !previewing && (
                        <object
                          data={previewUrl}
                          type="application/pdf"
                          className="w-full"
                          style={{ height: "560px" }}
                          aria-label="Xem trước CV"
                        >
                          <div className="p-4 text-sm text-muted-foreground text-center">
                            Trình duyệt không hiển thị PDF nội tuyến.{" "}
                            <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                              Mở trong tab mới
                            </a>
                          </div>
                        </object>
                      )}
                      {previewing && (
                        <div className="flex items-center justify-center h-40 text-sm text-muted-foreground gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          Đang tạo bản xem trước…
                        </div>
                      )}
                    </div>
                  )}

                  {/* Prompt to select if nothing chosen yet */}
                  {!selectedTemplateId && (
                    <p className="text-xs text-muted-foreground text-center">
                      Chọn một mẫu ở trên để xem trước và áp dụng.
                    </p>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
