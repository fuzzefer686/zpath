"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Link2, UploadCloud, FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CERT_CATALOG_BY_LANGUAGE } from "@/lib/cv/certCatalog";

interface ItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Record<string, any>) => Promise<void>;
  type: "education" | "experience" | "skill" | "certificate" | "award" | "activity";
  item: Record<string, any> | null; // null for add mode, object for edit mode
}

export function ItemDialog({
  isOpen,
  onClose,
  onSave,
  type,
  item,
}: ItemDialogProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleUploadEvidence = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingEvidence(true);
    setUploadError(null);

    const formDataUpload = new FormData();
    formDataUpload.append("file", file);
    formDataUpload.append("itemId", formData.id);
    formDataUpload.append("type", type === "certificate" ? "certificate" : "award");

    try {
      const response = await fetch("/api/profile/cv/evidence", {
        method: "POST",
        body: formDataUpload,
      });

      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error || "Không thể tải lên file.");
      }

      // Update local form state with the signed URL returned from the server
      updateField("evidence_url", result.evidence_url);
    } catch (err) {
      console.error(err);
      setUploadError(err instanceof Error ? err.message : "Có lỗi xảy ra khi tải lên file.");
    } finally {
      setIsUploadingEvidence(false);
    }
  };

  const handleDeleteEvidence = () => {
    updateField("evidence_url", "");
  };

  // Sync state when item or type changes
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUploadError(null);
      setIsUploadingEvidence(false);
      if (item) {
        setFormData({ ...item });
      } else {
        // Initialize default empty values depending on type
        if (type === "education") {
          setFormData({ level: "THPT", school_name: "", gpa: "", grade_10: "", grade_11: "", grade_12: "", start_year: "", end_year: "", is_current: false });
        } else if (type === "experience") {
          setFormData({ type: "project", title: "", organization: "", description: "", start_date: "", end_date: "", is_current: false });
        } else if (type === "skill") {
          setFormData({ name: "", category: "technical", proficiency: 3 });
        } else if (type === "certificate") {
          setFormData({ cert_type_code: "IELTS_ACADEMIC", score: "", issued_date: "", expiry_date: "", evidence_url: "", is_verified: false });
        } else if (type === "award") {
          setFormData({ title: "", level: "school", rank: "", issuer: "", award_year: "" });
        } else if (type === "activity") {
          setFormData({ title: "", role: "", organization: "", description: "", start_date: "", end_date: "", hours: "" });
        }
      }
    }
  }, [isOpen, item, type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (key: string, value: any) => {
    setFormData((prev: Record<string, any>) => ({ ...prev, [key]: value }));
  };

  const getTitle = () => {
    const mode = item ? "Chỉnh sửa" : "Thêm mới";
    switch (type) {
      case "education":
        return `${mode} Học vấn / Học bạ`;
      case "experience":
        return `${mode} Kinh nghiệm / Dự án`;
      case "skill":
        return `${mode} Kỹ năng`;
      case "certificate":
        return `${mode} Chứng chỉ`;
      case "award":
        return `${mode} Giải thưởng`;
      case "activity":
        return `${mode} Hoạt động ngoại khóa`;
      default:
        return mode;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          {/* Dialog Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 20 }}
            className="relative w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl border-t sm:border border-white/20 bg-white p-6 shadow-2xl backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900 max-h-[85vh] sm:max-h-[90vh] overflow-y-auto pb-24 sm:pb-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-muted pb-3 mb-4">
              <h3 className="font-display text-lg font-bold text-foreground">
                {getTitle()}
              </h3>
              <Button
                onClick={onClose}
                variant="ghost"
                size="sm"
                className="h-8 w-8 rounded-full p-0 hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Type-Specific Fields */}
              {type === "education" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Cấp học</label>
                      <select
                        value={formData.level || ""}
                        onChange={(e) => updateField("level", e.target.value)}
                        className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary"
                        required
                      >
                        <option value="THPT">Trung học Phổ thông (THPT)</option>
                        <option value="THCS">Trung học Cơ sở (THCS)</option>
                        <option value="university">Đại học / Cao đẳng</option>
                        <option value="other">Khác</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Tên trường</label>
                      <input
                        type="text"
                        value={formData.school_name || ""}
                        onChange={(e) => updateField("school_name", e.target.value)}
                        className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary"
                        placeholder="vd: THPT Chuyên Hà Nội - Amsterdam"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Năm bắt đầu</label>
                      <input
                        type="number"
                        value={formData.start_year || ""}
                        onChange={(e) => updateField("start_year", e.target.value ? parseInt(e.target.value) : "")}
                        className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary"
                        placeholder="vd: 2023"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Năm kết thúc / Dự kiến</label>
                      <input
                        type="number"
                        value={formData.end_year || ""}
                        onChange={(e) => updateField("end_year", e.target.value ? parseInt(e.target.value) : "")}
                        className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary"
                        placeholder="vd: 2026"
                        disabled={formData.is_current}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 py-1">
                    <input
                      type="checkbox"
                      id="edu_is_current"
                      checked={!!formData.is_current}
                      onChange={(e) => {
                        updateField("is_current", e.target.checked);
                        if (e.target.checked) updateField("end_year", "");
                      }}
                      className="rounded text-primary border-input focus:ring-primary h-4 w-4"
                    />
                    <label htmlFor="edu_is_current" className="text-xs font-semibold text-foreground cursor-pointer select-none">
                      Đang học tại đây
                    </label>
                  </div>

                  {formData.linked_transcript_id && (
                    <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2">
                      <Link2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                      <span className="text-xs text-primary font-semibold">Đã liên kết học bạ</span>
                      <span className="ml-auto text-[10px] font-mono text-muted-foreground truncate max-w-[120px]">
                        {formData.linked_transcript_id}
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 border-t border-muted/50 pt-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Điểm trung bình (GPA)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="10"
                        value={formData.gpa || ""}
                        onChange={(e) => updateField("gpa", e.target.value ? parseFloat(e.target.value) : "")}
                        className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary"
                        placeholder="vd: 9.2"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Điểm trung bình Lớp 12</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="10"
                        value={formData.grade_12 || ""}
                        onChange={(e) => updateField("grade_12", e.target.value ? parseFloat(e.target.value) : "")}
                        className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary"
                        placeholder="vd: 9.5"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Điểm trung bình Lớp 11</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="10"
                        value={formData.grade_11 || ""}
                        onChange={(e) => updateField("grade_11", e.target.value ? parseFloat(e.target.value) : "")}
                        className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary"
                        placeholder="vd: 9.0"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Điểm trung bình Lớp 10</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="10"
                        value={formData.grade_10 || ""}
                        onChange={(e) => updateField("grade_10", e.target.value ? parseFloat(e.target.value) : "")}
                        className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary"
                        placeholder="vd: 8.8"
                      />
                    </div>
                  </div>
                </>
              )}

              {type === "experience" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Loại kinh nghiệm</label>
                      <select
                        value={formData.type || "project"}
                        onChange={(e) => updateField("type", e.target.value)}
                        className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary"
                        required
                      >
                        <option value="project">Dự án cá nhân/nhóm</option>
                        <option value="competition">Cuộc thi</option>
                        <option value="volunteer">Hoạt động tình nguyện</option>
                        <option value="internship">Thực tập</option>
                        <option value="work">Công việc làm thêm/chính thức</option>
                        <option value="other">Khác</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Tiêu đề / Tên vị trí</label>
                      <input
                        type="text"
                        value={formData.title || ""}
                        onChange={(e) => updateField("title", e.target.value)}
                        className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary"
                        placeholder="vd: Trưởng nhóm Dự án IoT / Thí sinh cuộc thi"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Tổ chức / Nơi thực hiện</label>
                    <input
                      type="text"
                      value={formData.organization || ""}
                      onChange={(e) => updateField("organization", e.target.value)}
                      className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary"
                      placeholder="vd: CLB Tin học / Tên trường THPT"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Ngày bắt đầu</label>
                      <input
                        type="date"
                        value={formData.start_date || ""}
                        onChange={(e) => updateField("start_date", e.target.value)}
                        className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Ngày kết thúc</label>
                      <input
                        type="date"
                        value={formData.end_date || ""}
                        onChange={(e) => updateField("end_date", e.target.value)}
                        className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary"
                        disabled={formData.is_current}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 py-1">
                    <input
                      type="checkbox"
                      id="exp_is_current"
                      checked={!!formData.is_current}
                      onChange={(e) => {
                        updateField("is_current", e.target.checked);
                        if (e.target.checked) updateField("end_date", "");
                      }}
                      className="rounded text-primary border-input focus:ring-primary h-4 w-4"
                    />
                    <label htmlFor="exp_is_current" className="text-xs font-semibold text-foreground cursor-pointer select-none">
                      Đang thực hiện công việc này
                    </label>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Mô tả chi tiết</label>
                    <textarea
                      value={formData.description || ""}
                      onChange={(e) => updateField("description", e.target.value)}
                      rows={3}
                      className="w-full rounded-xl border border-input bg-background p-3 text-sm outline-none transition focus:border-primary resize-none"
                      placeholder="Mô tả nhiệm vụ, công việc bạn đã thực hiện và kết quả đạt được..."
                    />
                  </div>
                </>
              )}

              {type === "skill" && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Tên kỹ năng</label>
                    <input
                      type="text"
                      value={formData.name || ""}
                      onChange={(e) => updateField("name", e.target.value)}
                      className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary"
                      placeholder="vd: Lập trình C++ / Kỹ năng Giao tiếp"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Phân loại kỹ năng</label>
                      <select
                        value={formData.category || "technical"}
                        onChange={(e) => updateField("category", e.target.value)}
                        className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary"
                        required
                      >
                        <option value="technical">Kỹ thuật / Chuyên môn</option>
                        <option value="soft">Kỹ năng mềm</option>
                        <option value="language">Ngoại ngữ</option>
                        <option value="tool">Công cụ</option>
                        <option value="other">Khác</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Độ thông thạo (1-5)</label>
                      <select
                        value={formData.proficiency || 3}
                        onChange={(e) => updateField("proficiency", parseInt(e.target.value))}
                        className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary"
                        required
                      >
                        <option value="1">1/5 - Cơ bản</option>
                        <option value="2">2/5 - Sơ cấp</option>
                        <option value="3">3/5 - Trung cấp</option>
                        <option value="4">4/5 - Cao cấp</option>
                        <option value="5">5/5 - Thành thạo / Chuyên gia</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {type === "certificate" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Loại chứng chỉ</label>
                      <select
                        value={formData.cert_type_code || "IELTS_ACADEMIC"}
                        onChange={(e) => updateField("cert_type_code", e.target.value)}
                        className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary"
                        required
                      >
                        {Object.entries(CERT_CATALOG_BY_LANGUAGE).map(([lang, entries]) => (
                          <optgroup key={lang} label={lang}>
                            {entries.map((entry) => (
                              <option key={entry.code} value={entry.code}>
                                {entry.label}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Điểm số / Xếp loại</label>
                      <input
                        type="text"
                        value={formData.score || ""}
                        onChange={(e) => updateField("score", e.target.value)}
                        className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary"
                        placeholder="vd: 7.5 / 1450"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Ngày cấp</label>
                      <input
                        type="date"
                        value={formData.issued_date || ""}
                        onChange={(e) => updateField("issued_date", e.target.value)}
                        className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Ngày hết hạn</label>
                      <input
                        type="date"
                        value={formData.expiry_date || ""}
                        onChange={(e) => updateField("expiry_date", e.target.value)}
                        className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-muted/50 pt-3 mt-3">
                    <label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                      Minh chứng chứng chỉ <span className="font-normal text-[10px] text-muted-foreground">(PDF, JPEG, PNG, WebP &lt; 10MB)</span>
                    </label>
                    {formData.id ? (
                      formData.evidence_url ? (
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="h-4 w-4 shrink-0 text-primary" />
                            <a
                              href={formData.evidence_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-semibold text-primary hover:underline truncate"
                            >
                              Xem minh chứng đã tải lên
                            </a>
                          </div>
                          <Button
                            type="button"
                            onClick={handleDeleteEvidence}
                            variant="ghost"
                            size="sm"
                            className="h-8 rounded-lg px-2 hover:bg-destructive/10 text-destructive flex items-center gap-1.5"
                            disabled={isUploadingEvidence}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span className="text-xs font-bold">Xóa</span>
                          </Button>
                        </div>
                      ) : (
                        <div className="relative">
                          <label className="flex flex-col items-center justify-center w-full h-24 border border-dashed border-muted-foreground/30 rounded-xl cursor-pointer hover:bg-muted/30 hover:border-primary/50 transition">
                            <div className="flex flex-col items-center justify-center pt-4 pb-4">
                              {isUploadingEvidence ? (
                                <>
                                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                  <p className="mt-1.5 text-xs font-semibold text-primary">Đang tải lên...</p>
                                </>
                              ) : (
                                <>
                                  <UploadCloud className="h-5 w-5 text-muted-foreground group-hover:text-primary mb-1" />
                                  <p className="text-xs font-semibold text-muted-foreground text-center px-4">
                                    Nhấn vào đây để chọn file minh chứng
                                  </p>
                                </>
                              )}
                            </div>
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp,application/pdf"
                              onChange={handleUploadEvidence}
                              disabled={isUploadingEvidence}
                              className="hidden"
                            />
                          </label>
                        </div>
                      )
                    ) : (
                      <div className="rounded-xl border border-dashed border-muted-foreground/20 p-3 text-center bg-muted/5">
                        <span className="text-xs text-muted-foreground font-semibold">
                          Lưu thông tin chứng chỉ trước để mở khóa chức năng tải lên file minh chứng.
                        </span>
                      </div>
                    )}
                    {uploadError && (
                      <p className="text-[11px] font-semibold text-destructive mt-1">{uploadError}</p>
                    )}
                  </div>
                </>
              )}

              {type === "award" && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Tên giải thưởng</label>
                    <input
                      type="text"
                      value={formData.title || ""}
                      onChange={(e) => updateField("title", e.target.value)}
                      className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary"
                      placeholder="vd: Giải Nhì Học sinh giỏi môn Vật lý"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Cấp giải thưởng</label>
                      <select
                        value={formData.level || "school"}
                        onChange={(e) => updateField("level", e.target.value)}
                        className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary"
                        required
                      >
                        <option value="school">Cấp Trường</option>
                        <option value="district">Cấp Quận/Huyện</option>
                        <option value="province">Cấp Tỉnh/Thành phố</option>
                        <option value="national">Cấp Quốc gia</option>
                        <option value="international">Cấp Quốc tế</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Xếp giải / Danh hiệu</label>
                      <input
                        type="text"
                        value={formData.rank || ""}
                        onChange={(e) => updateField("rank", e.target.value)}
                        className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary"
                        placeholder="vd: Giải Nhì / Khuyến khích"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Nơi cấp</label>
                      <input
                        type="text"
                        value={formData.issuer || ""}
                        onChange={(e) => updateField("issuer", e.target.value)}
                        className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary"
                        placeholder="vd: Sở Giáo dục Hà Nội"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Năm đạt giải</label>
                      <input
                        type="number"
                        value={formData.award_year || ""}
                        onChange={(e) => updateField("award_year", e.target.value ? parseInt(e.target.value) : "")}
                        className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary"
                        placeholder="vd: 2024"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-muted/50 pt-3 mt-3">
                    <label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                      Minh chứng giải thưởng <span className="font-normal text-[10px] text-muted-foreground">(PDF, JPEG, PNG, WebP &lt; 10MB)</span>
                    </label>
                    {formData.id ? (
                      formData.evidence_url ? (
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="h-4 w-4 shrink-0 text-primary" />
                            <a
                              href={formData.evidence_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-semibold text-primary hover:underline truncate"
                            >
                              Xem minh chứng đã tải lên
                            </a>
                          </div>
                          <Button
                            type="button"
                            onClick={handleDeleteEvidence}
                            variant="ghost"
                            size="sm"
                            className="h-8 rounded-lg px-2 hover:bg-destructive/10 text-destructive flex items-center gap-1.5"
                            disabled={isUploadingEvidence}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span className="text-xs font-bold">Xóa</span>
                          </Button>
                        </div>
                      ) : (
                        <div className="relative">
                          <label className="flex flex-col items-center justify-center w-full h-24 border border-dashed border-muted-foreground/30 rounded-xl cursor-pointer hover:bg-muted/30 hover:border-primary/50 transition">
                            <div className="flex flex-col items-center justify-center pt-4 pb-4">
                              {isUploadingEvidence ? (
                                <>
                                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                  <p className="mt-1.5 text-xs font-semibold text-primary">Đang tải lên...</p>
                                </>
                              ) : (
                                <>
                                  <UploadCloud className="h-5 w-5 text-muted-foreground group-hover:text-primary mb-1" />
                                  <p className="text-xs font-semibold text-muted-foreground text-center px-4">
                                    Nhấn vào đây để chọn file minh chứng
                                  </p>
                                </>
                              )}
                            </div>
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp,application/pdf"
                              onChange={handleUploadEvidence}
                              disabled={isUploadingEvidence}
                              className="hidden"
                            />
                          </label>
                        </div>
                      )
                    ) : (
                      <div className="rounded-xl border border-dashed border-muted-foreground/20 p-3 text-center bg-muted/5">
                        <span className="text-xs text-muted-foreground font-semibold">
                          Lưu thông tin giải thưởng trước để mở khóa chức năng tải lên file minh chứng.
                        </span>
                      </div>
                    )}
                    {uploadError && (
                      <p className="text-[11px] font-semibold text-destructive mt-1">{uploadError}</p>
                    )}
                  </div>
                </>
              )}

              {type === "activity" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Tên hoạt động ngoại khóa</label>
                      <input
                        type="text"
                        value={formData.title || ""}
                        onChange={(e) => updateField("title", e.target.value)}
                        className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary"
                        placeholder="vd: Chiến dịch Mùa hè xanh"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Vai trò / Chức vụ</label>
                      <input
                        type="text"
                        value={formData.role || ""}
                        onChange={(e) => updateField("role", e.target.value)}
                        className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary"
                        placeholder="vd: Thành viên / Trưởng nhóm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Tổ chức thực hiện</label>
                      <input
                        type="text"
                        value={formData.organization || ""}
                        onChange={(e) => updateField("organization", e.target.value)}
                        className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary"
                        placeholder="vd: Đoàn trường THPT"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Số giờ tích lũy (nếu có)</label>
                      <input
                        type="number"
                        value={formData.hours || ""}
                        onChange={(e) => updateField("hours", e.target.value ? parseInt(e.target.value) : "")}
                        className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary"
                        placeholder="vd: 40"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Ngày bắt đầu</label>
                      <input
                        type="date"
                        value={formData.start_date || ""}
                        onChange={(e) => updateField("start_date", e.target.value)}
                        className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Ngày kết thúc</label>
                      <input
                        type="date"
                        value={formData.end_date || ""}
                        onChange={(e) => updateField("end_date", e.target.value)}
                        className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Mô tả hoạt động</label>
                    <textarea
                      value={formData.description || ""}
                      onChange={(e) => updateField("description", e.target.value)}
                      rows={3}
                      className="w-full rounded-xl border border-input bg-background p-3 text-sm outline-none transition focus:border-primary resize-none"
                      placeholder="Mô tả ngắn gọn về đóng góp của bạn và hoạt động..."
                    />
                  </div>
                </>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 border-t border-muted pt-4">
                <Button
                  type="button"
                  onClick={onClose}
                  variant="ghost"
                  className="rounded-xl"
                  disabled={isSaving}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  variant="hero"
                  className="rounded-xl px-6 min-w-[100px] flex items-center justify-center gap-1.5"
                  disabled={isSaving}
                >
                  {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isSaving ? "Đang lưu..." : "Lưu lại"}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
