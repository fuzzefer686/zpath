"use client";

import { useState } from "react";
import { Sparkles, Edit2, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CvProfile } from "@/hooks/useCvData";

interface SummaryFormProps {
  profile: CvProfile;
  onSave: (data: any) => Promise<void>;
}

const COMMON_MAJORS = [
  { code: "CNTT", name: "Công nghệ thông tin" },
  { code: "KT-CN", name: "Kỹ thuật Công nghệ" },
  { code: "KDQT", name: "Kinh doanh Quốc tế" },
  { code: "NNA", name: "Ngôn ngữ Anh" },
  { code: "QTKD", name: "Quản trị Kinh doanh" },
  { code: "KHMT", name: "Khoa học Máy tính" },
];

export function SummaryForm({ profile, onSave }: SummaryFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [headline, setHeadline] = useState(profile.headline || "");
  const [summary, setSummary] = useState(profile.summary || "");
  const [targetMajorCode, setTargetMajorCode] = useState(profile.target_major_code || "");
  const [targetCareer, setTargetCareer] = useState(profile.target_career || "");

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        headline: headline || null,
        summary: summary || null,
        target_major_code: targetMajorCode || null,
        target_career: targetCareer || null,
      });
      setIsEditing(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setHeadline(profile.headline || "");
    setSummary(profile.summary || "");
    setTargetMajorCode(profile.target_major_code || "");
    setTargetCareer(profile.target_career || "");
    setIsEditing(false);
  };

  const getMajorName = (code: string | null) => {
    if (!code) return "Chưa cập nhật";
    const found = COMMON_MAJORS.find((m) => m.code === code);
    return found ? `${found.name} (${code})` : code;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Tóm tắt & Mục tiêu
        </h4>
        {!isEditing ? (
          <Button
            onClick={() => setIsEditing(true)}
            variant="ghost"
            size="sm"
            className="rounded-xl hover:bg-primary/5 text-primary text-xs flex items-center gap-1.5 h-8 px-2.5"
          >
            <Edit2 className="h-3.5 w-3.5" /> Chỉnh sửa
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              onClick={handleCancel}
              variant="ghost"
              size="sm"
              className="rounded-xl hover:bg-muted text-xs flex items-center gap-1 h-8 px-2.5"
              disabled={isSaving}
            >
              <X className="h-3.5 w-3.5" /> Hủy
            </Button>
            <Button
              onClick={handleSave}
              variant="hero"
              size="sm"
              className="rounded-xl text-xs flex items-center gap-1 h-8 px-2.5"
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              {isSaving ? "Đang lưu..." : "Lưu"}
            </Button>
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">
              Tiêu đề hồ sơ (Headline - 1 dòng ngắn gọn)
            </label>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary"
              placeholder="Ví dụ: Học sinh lớp 12 chuyên Tin đam mê Machine Learning"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">
                Ngành học mục tiêu
              </label>
              <select
                value={targetMajorCode}
                onChange={(e) => setTargetMajorCode(e.target.value)}
                className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary"
              >
                <option value="">Chọn ngành mục tiêu</option>
                {COMMON_MAJORS.map((m) => (
                  <option key={m.code} value={m.code}>
                    {m.name} ({m.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">
                Nghề nghiệp mục tiêu
              </label>
              <input
                type="text"
                value={targetCareer}
                onChange={(e) => setTargetCareer(e.target.value)}
                className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary"
                placeholder="Ví dụ: AI Engineer / Data Analyst"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">
              Mục tiêu & Tóm tắt bản thân
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-input bg-background p-3 text-sm outline-none transition focus:border-primary resize-none"
              placeholder="Tóm tắt ngắn gọn các thế mạnh, định hướng và nguyện vọng của bạn..."
            />
          </div>
        </div>
      ) : (
        <div className="space-y-3 rounded-xl bg-muted/30 p-4 border border-muted/50">
          {profile.headline && (
            <div>
              <span className="block text-xs font-semibold text-muted-foreground">
                Tiêu đề hồ sơ
              </span>
              <span className="text-sm font-semibold text-foreground">
                {profile.headline}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <span className="block text-xs font-semibold text-muted-foreground">
                Ngành mục tiêu
              </span>
              <span className="text-sm font-medium text-foreground">
                {getMajorName(profile.target_major_code)}
              </span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-muted-foreground">
                Nghề nghiệp mục tiêu
              </span>
              <span className="text-sm font-medium text-foreground">
                {profile.target_career || "Chưa cập nhật"}
              </span>
            </div>
          </div>

          {profile.summary && (
            <div>
              <span className="block text-xs font-semibold text-muted-foreground">
                Giới thiệu / Mục tiêu
              </span>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-line mt-0.5">
                {profile.summary}
              </p>
            </div>
          )}

          {!profile.headline && !profile.summary && (
            <p className="text-sm text-muted-foreground italic flex items-center gap-1">
              <Sparkles className="h-4 w-4 text-primary" /> Bạn chưa nhập tóm tắt hồ sơ mục tiêu.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
