"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  User,
  Shield,
  Mail,
  School,
  Save,
  Loader2,
  Check,
  GraduationCap,
  Sparkles,
  BookOpen,
  Briefcase,
  Trophy,
  Award,
  Heart,
  Edit2,
  Trash2,
  Layers,
  X,
  Brain,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/zpath/AuthProvider";
import { useProfile } from "@/hooks/useProfile";
import { useCvData } from "@/hooks/useCvData";

// CV Builder components
import { SectionWrapper } from "./cv/SectionWrapper";
import { BasicInfoForm } from "./cv/BasicInfoForm";
import { SummaryForm } from "./cv/SummaryForm";
import { ItemDialog } from "./cv/ItemDialog";
import { LayoutManager } from "./cv/LayoutManager";
import { CvExportPanel } from "./cv/CvExportPanel";
import { TemplatePicker } from "./cv/TemplatePicker";
// CvSharePanel (public share link) tạm ẩn theo yêu cầu — consent chuyển vào CvExportPanel.
// Backend share routes/RPC vẫn giữ nguyên để bật lại sau.
import { AiSuggestionPanel } from "./cv/AiSuggestionPanel";
import { CapabilityMapPanel } from "./cv/CapabilityMapPanel";
import { CvSectionWizard, type WizardStep } from "./cv/CvSectionWizard";

// Short, friendly labels for the wizard progress rail (one per CV block).
const SECTION_TITLES: Record<string, string> = {
  basic: "Thông tin cơ bản",
  summary: "Tóm tắt & Mục tiêu",
  education: "Học vấn & Học bạ",
  experience_skills: "Kinh nghiệm & Kỹ năng",
  certs_awards: "Chứng chỉ & Giải thưởng",
  activities: "Hoạt động ngoại khóa",
  personality: "Trắc nghiệm tính cách",
};

interface PersonalityQuestion {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  dimension: string;
}

interface PersonalityResult {
  id: string;
  result_code: string;
  summary: string;
  scores: Record<string, number>;
  include_in_cv: boolean;
}

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

function EmptyState({ icon, title, description, actionText, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-6 bg-muted/10 rounded-2xl border border-dashed border-muted/55 my-2">
      <div className="p-3 bg-muted/20 text-muted-foreground rounded-xl mb-3 shrink-0">
        {icon}
      </div>
      <h4 className="text-xs font-semibold text-foreground mb-1">{title}</h4>
      <p className="text-[11px] text-muted-foreground max-w-[260px] leading-normal mb-3">{description}</p>
      {actionText && onAction && (
        <Button
          onClick={onAction}
          variant="outline"
          size="sm"
          className="h-8 rounded-lg text-xs border-primary/20 hover:bg-primary/5 hover:text-primary gap-1"
        >
          {actionText}
        </Button>
      )}
    </div>
  );
}

export function ProfilePage() {
  const { openAuthPrompt } = useAuth();
  const { profile, isLoading: profileLoading, error: profileError, updateProfile, uploadAvatar } = useProfile();
  
  // Load CV Builder data
  const { data: cvData, isLoading: cvLoading, error: cvError, mutate: mutateCv, refresh } = useCvData();

  // AI availability — single source of truth for whether the AI input panels
  // (gợi ý AI + bản đồ năng lực) render at all. null = unknown/loading.
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null);

  // Personality test state
  const [personalityResult, setPersonalityResult] = useState<PersonalityResult | null>(null);
  const [isTestingPersonality, setIsTestingPersonality] = useState(false);
  const [questions, setQuestions] = useState<PersonalityQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, "a" | "b">>({});
  const [submittingTest, setSubmittingTest] = useState(false);

  const fetchPersonality = async () => {
    try {
      const res = await fetch("/api/personality?action=latest");
      if (res.ok) {
        const json = await res.json();
        setPersonalityResult(json.result || null);
      }
    } catch (err) {
      console.error("Error fetching latest personality:", err);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPersonality();
  }, []);

  // Probe AI availability once so we can hide the AI input panels when the
  // feature is disabled (kill-switch / not configured / under-16).
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/cv/ai");
        if (!res.ok) return;
        const json = (await res.json()) as { aiEnabled?: boolean };
        if (active && typeof json.aiEnabled === "boolean") setAiAvailable(json.aiEnabled);
      } catch {
        // Leave as null (unknown) — panels stay hidden until we know it's on.
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const startTest = async () => {
    setIsTestingPersonality(true);
    setLoadingQuestions(true);
    setCurrentQuestionIdx(0);
    setAnswers({});
    try {
      const res = await fetch("/api/personality?action=questions&slug=mbti");
      if (res.ok) {
        const json = await res.json();
        setQuestions(json.questions || []);
      }
    } catch (err) {
      console.error("Error fetching questions:", err);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleAnswerSelect = async (choice: "a" | "b") => {
    const currentQuestion = questions[currentQuestionIdx];
    const newAnswers = { ...answers, [currentQuestion.id]: choice };
    setAnswers(newAnswers);

    if (currentQuestionIdx + 1 >= questions.length) {
      // Last question - submit
      setSubmittingTest(true);
      try {
        const res = await fetch("/api/personality", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "submit",
            test_slug: "mbti",
            answers: newAnswers,
          }),
        });

        if (res.ok) {
          const json = await res.json();
          setPersonalityResult(json.result);
          setIsTestingPersonality(false);
          refresh(); // Refresh CV layout
        }
      } catch (err) {
        console.error("Error submitting test:", err);
      } finally {
        setSubmittingTest(false);
      }
    } else {
      setCurrentQuestionIdx((idx) => idx + 1);
    }
  };

  const handleToggleCv = async (resultId: string, includeInCv: boolean) => {
    try {
      const res = await fetch("/api/personality", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_cv",
          result_id: resultId,
          include_in_cv: includeInCv,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        setPersonalityResult(json.result);
        refresh(); // Refresh CV layout
      }
    } catch (err) {
      console.error("Error toggling include_in_cv:", err);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [school, setSchool] = useState("");
  const [grade, setGrade] = useState("");
  const [targetUniversity, setTargetUniversity] = useState("");
  
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Tabs: 'general' (legacy Profile) or 'cv' (CV Builder)
  const [activeTab, setActiveTab] = useState<"general" | "cv">("cv");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // Modal control states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<"education" | "experience" | "skill" | "certificate" | "award" | "activity">("education");
  const [selectedItem, setSelectedItem] = useState<Record<string, any> | null>(null);

  // Sync profile data when loaded
  useEffect(() => {
    if (profile) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplayName(profile.display_name || "");
      setBio(profile.bio || "");
      setSchool(profile.school || "");
      setGrade(profile.grade || "");
      setTargetUniversity(profile.target_university || "");
    }
  }, [profile]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setSuccessMessage(null);
    try {
      await uploadAvatar(file);
      showToast("Ảnh đại diện đã được cập nhật thành công!");
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  // Avatar upload from inside the CV builder (BasicInfoForm). The CV photo lives
  // in cv_profiles.avatar_url (a different column than the account avatar in
  // profiles), so it has its own endpoint. Refresh CV data afterwards so the new
  // photo appears in the preview/export.
  const handleCvAvatarUpload = async (file: File) => {
    const form = new FormData();
    form.append("avatar", file);
    const res = await fetch("/api/profile/cv/avatar", { method: "POST", body: form });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.error) {
      throw new Error(json.error || "Không thể tải lên ảnh đại diện CV.");
    }
    await refresh();
    showToast("Ảnh đại diện CV đã được cập nhật!");
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setSuccessMessage(null);

    try {
      await updateProfile({
        display_name: displayName,
        bio,
        school,
        grade,
        target_university: targetUniversity,
      });
      showToast("Thông tin cá nhân đã được lưu thành công!");
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const showToast = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);
  };

  // CV CRUD actions wrapper
  const handleSaveBasic = async (basicData: Record<string, any>) => {
    try {
      await mutateCv("update_basic", basicData);
      showToast("Cập nhật thông tin cơ bản CV thành công!");
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveSummary = async (summaryData: Record<string, any>) => {
    try {
      await mutateCv("update_summary", summaryData);
      showToast("Cập nhật tóm tắt mục tiêu CV thành công!");
    } catch (err) {
      console.error(err);
    }
  };

  const openAddDialog = (type: typeof dialogType) => {
    setSelectedItem(null);
    setDialogType(type);
    setDialogOpen(true);
  };

  const openEditDialog = (type: typeof dialogType, item: Record<string, any>) => {
    setSelectedItem(item);
    setDialogType(type);
    setDialogOpen(true);
  };

  const handleSaveItem = async (itemData: Record<string, any>) => {
    try {
      const actionMap: Record<string, string> = {
        education: "save_education",
        experience: "save_experience",
        skill: "save_skill",
        certificate: "save_certificate",
        award: "save_award",
        activity: "save_activity",
      };
      await mutateCv(actionMap[dialogType], itemData);
      showToast("Lưu bản ghi thành công!");
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteItem = async (type: typeof dialogType, id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa bản ghi này?")) return;
    try {
      const actionMap: Record<string, string> = {
        education: "delete_education",
        experience: "delete_experience",
        skill: "delete_skill",
        certificate: "delete_certificate",
        award: "delete_award",
        activity: "delete_activity",
      };
      await mutateCv(actionMap[type], { id });
      showToast("Xóa bản ghi thành công!");
    } catch (err) {
      console.error(err);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        staggerChildren: 0.1,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const },
    },
  };

  if ((profileLoading || cvLoading) && !profile) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center bg-zpath-gradient text-foreground">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 text-sm font-medium text-muted-foreground animate-pulse">
          Đang tải thông tin hồ sơ...
        </p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md rounded-2xl border border-white/20 bg-white/70 p-8 shadow-xl backdrop-blur-xl"
        >
          <User className="mx-auto h-16 w-16 text-muted-foreground" />
          <h2 className="mt-4 font-display text-2xl font-bold">Chưa đăng nhập</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Bạn cần đăng nhập tài khoản ZPath để xem và tùy chỉnh trang thông tin cá nhân.
          </p>
          <Button onClick={openAuthPrompt} variant="hero" className="mt-6 w-full">
            Đăng nhập ngay
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-zpath-gradient px-4 pt-12 pb-24 md:pb-16 md:px-8">
      {/* Success Toast */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-6 py-3 shadow-lg shadow-emerald-500/10 backdrop-blur-md"
          >
            <Check className="h-5 w-5 text-emerald-500" />
            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              {successMessage}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mx-auto max-w-5xl">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* Header Section */}
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row md:items-end">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Sparkles className="h-3 w-3" /> Trang Cá Nhân
              </span>
              <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-gradient-hero">
                Hồ Sơ ZPath của Bạn
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Tùy chỉnh thông tin cá nhân và xây dựng CV học tập định hướng nghề nghiệp sớm.
              </p>
            </div>
            
            <Link href="/advisor">
              <Button variant="outline" className="rounded-xl border-primary/20 hover:bg-primary/5">
                Quay lại Khảo sát
              </Button>
            </Link>
          </div>

          {(profileError || cvError) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive"
            >
              {profileError || cvError}
            </motion.div>
          )}

          {/* Tab Selection — segmented control */}
          <div className="flex w-full gap-1 rounded-2xl border border-white/20 bg-white/60 p-1 shadow-glow backdrop-blur-xl sm:w-auto sm:inline-flex dark:border-white/10 dark:bg-zinc-900/60">
            {([
              { key: "cv", label: "Hồ sơ & CV Builder" },
              { key: "general", label: "Thông tin chung" },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition sm:flex-none ${
                  activeTab === tab.key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            
            {/* Left Column: Avatar and Quick Stats */}
            <div className="space-y-6 md:col-span-1">
              <motion.div
                variants={cardVariants}
                className="flex flex-col items-center rounded-2xl border border-white/20 bg-white/70 p-6 text-center shadow-glow backdrop-blur-xl"
              >
                {/* Avatar upload block */}
                <div
                  onClick={handleAvatarClick}
                  className="group relative cursor-pointer overflow-hidden rounded-full border-4 border-background shadow-lg"
                >
                  <div className="h-28 w-28 md:h-32 md:w-32 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white text-4xl font-bold">
                    {isUploading ? (
                      <Loader2 className="h-8 w-8 animate-spin" />
                    ) : profile.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={profile.avatar_url}
                        alt={displayName || profile.username}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-110"
                      />
                    ) : (
                      <User className="h-14 w-14" />
                    )}
                  </div>
                  
                  {/* Upload Overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 opacity-0 transition duration-300 group-hover:opacity-100">
                    <Camera className="h-6 w-6 text-white" />
                    <span className="mt-1 text-[10px] font-bold text-white uppercase tracking-wider">
                      Thay đổi
                    </span>
                  </div>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                />

                <h3 className="mt-4 font-display text-xl font-bold">
                  {displayName || profile.username}
                </h3>
                
                {/* Role Badge */}
                <div className="mt-2">
                  {profile.role === "admin" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-3 py-1 text-xs font-bold text-white shadow-sm">
                      <Shield className="h-3.5 w-3.5" /> Quản trị viên
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-indigo-500 to-blue-600 px-3 py-1 text-xs font-bold text-white shadow-sm">
                      <User className="h-3.5 w-3.5" /> Thành viên
                    </span>
                  )}
                </div>

                {cvData?.profile && (
                  <div className="mt-4 w-full bg-muted/30 rounded-xl p-3 border border-muted/50 text-left">
                    <div className="flex justify-between items-center text-xs font-bold text-muted-foreground mb-1">
                      <span>Độ hoàn thiện CV</span>
                      <span className="text-primary">{cvData.profile.completeness_score}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-zinc-800 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-indigo-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${cvData.profile.completeness_score}%` }}
                      />
                    </div>
                  </div>
                )}

                <p className="mt-3 text-xs text-muted-foreground italic">
                  @{profile.username}
                </p>

                <div className="mt-6 w-full border-t border-muted/50 pt-4 text-left space-y-3">
                  <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                    <Mail className="h-4 w-4 shrink-0 text-primary" />
                    <span className="truncate">{profile.email}</span>
                  </div>
                  {profile.school && (
                    <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                      <School className="h-4 w-4 shrink-0 text-primary" />
                      <span className="truncate">{profile.school}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Right Column */}
            <div className="md:col-span-2 space-y-8">
              
              {/* Tab 1: General Info (Legacy) */}
              {activeTab === "general" && (
                <div className="space-y-6">
                  <motion.div
                    variants={cardVariants}
                    className="rounded-2xl border border-white/20 bg-white/70 p-6 shadow-glow backdrop-blur-xl md:p-8"
                  >
                    <h2 className="font-display text-xl font-bold flex items-center gap-2">
                      <User className="h-5 w-5 text-primary" /> Thông tin cá nhân
                    </h2>
                    
                    <form onSubmit={handleSave} className="mt-6 space-y-6">
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-muted-foreground">
                            Tên hiển thị
                          </label>
                          <input
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="h-11 w-full rounded-xl border-2 border-input bg-background px-3 text-sm outline-none transition focus:border-primary"
                            placeholder="vd: Minh Anh"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-muted-foreground">
                            Khối/Lớp
                          </label>
                          <input
                            value={grade}
                            onChange={(e) => setGrade(e.target.value)}
                            className="h-11 w-full rounded-xl border-2 border-input bg-background px-3 text-sm outline-none transition focus:border-primary"
                            placeholder="vd: Lớp 12"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-muted-foreground">
                          Trường THPT
                        </label>
                        <div className="relative">
                          <School className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <input
                            value={school}
                            onChange={(e) => setSchool(e.target.value)}
                            className="h-11 w-full rounded-xl border-2 border-input bg-background pl-11 pr-3 text-sm outline-none transition focus:border-primary"
                            placeholder="vd: THPT Chuyên Hà Nội - Amsterdam"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-muted-foreground">
                          Trường Đại học mục tiêu
                        </label>
                        <div className="relative">
                          <GraduationCap className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <input
                            value={targetUniversity}
                            onChange={(e) => setTargetUniversity(e.target.value)}
                            className="h-11 w-full rounded-xl border-2 border-input bg-background pl-11 pr-3 text-sm outline-none transition focus:border-primary"
                            placeholder="vd: Đại học Bách Khoa Hà Nội"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-muted-foreground">
                          Giới thiệu bản thân
                        </label>
                        <textarea
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                          rows={3}
                          className="w-full rounded-xl border-2 border-input bg-background p-3 text-sm outline-none transition focus:border-primary resize-none"
                          placeholder="Chia sẻ ngắn gọn về sở thích, định hướng học tập của bạn..."
                        />
                      </div>

                      <div className="flex justify-end pt-4">
                        <Button
                          type="submit"
                          variant="hero"
                          disabled={isSaving}
                          className="px-8 rounded-xl shadow-glow flex items-center gap-2"
                        >
                          {isSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                          {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
                        </Button>
                      </div>
                    </form>
                  </motion.div>

                  <motion.div
                    variants={cardVariants}
                    className="rounded-2xl border border-white/20 bg-white/70 p-6 shadow-glow backdrop-blur-xl"
                  >
                    <h3 className="font-display text-lg font-bold flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-primary" /> Kết quả Học tập & Tính cách
                    </h3>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Các thông số này được lưu từ lần khảo sát gần nhất. Để thay đổi, vui lòng làm lại khảo sát.
                    </p>

                    <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">
                      <div className="rounded-xl bg-muted/40 p-4 border border-muted/50 flex flex-col justify-between min-h-[96px]">
                        <div>
                          <span className="block text-xs font-semibold text-muted-foreground">MBTI</span>
                          <span className="mt-1 block text-2xl font-extrabold text-primary uppercase">
                            {personalityResult ? personalityResult.result_code : "Trống"}
                          </span>
                        </div>
                        <div className="mt-2">
                          <Button
                            type="button"
                            onClick={startTest}
                            variant="ghost"
                            className="p-0 h-auto text-primary hover:bg-transparent text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 hover:underline justify-start"
                          >
                            {personalityResult ? "Làm lại trắc nghiệm" : "Làm trắc nghiệm"}
                          </Button>
                        </div>
                      </div>

                      <div className="rounded-xl bg-muted/40 p-4 border border-muted/50">
                        <span className="block text-xs font-semibold text-muted-foreground">Điểm Toán</span>
                        <span className="mt-1 block text-2xl font-extrabold text-foreground">
                          {profile.score_math ? `${profile.score_math}/10` : "0"}
                        </span>
                      </div>

                      <div className="rounded-xl bg-muted/40 p-4 border border-muted/50 col-span-1">
                        <span className="block text-xs font-semibold text-muted-foreground">Điểm Văn</span>
                        <span className="mt-1 block text-2xl font-extrabold text-foreground">
                          {profile.score_literature ? `${profile.score_literature}/10` : "0"}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}

              {/* Tab 2: CV Builder (New) */}
              {activeTab === "cv" && cvData?.profile && (() => {
                const cvProfile = cvData.profile;
                return (
                  <div className="space-y-6">
                    {/* Template picker — choose archetype + colour scheme */}
                    <div className="relative">
                      <TemplatePicker
                        selectedTemplateId={selectedTemplateId}
                        onSelect={setSelectedTemplateId}
                      />
                    </div>

                    {/* Ephemeral PDF export (§13.8): consent gate + render + 30-min countdown + purge now */}
                    <CvExportPanel templateId={selectedTemplateId} />

                    {/* AI Suggestions and Capability Map Panels — hidden entirely
                        when AI is unavailable (kill-switch / not configured / <16). */}
                    {aiAvailable === true && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <AiSuggestionPanel
                          onSummaryAccepted={refresh}
                          onSkillAccepted={refresh}
                        />
                        <CapabilityMapPanel />
                      </div>
                    )}

                    {/* Personality (MBTI) — surfaced in the CV tab (§5.5) */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="relative overflow-hidden rounded-2xl border border-white/20 bg-white/60 p-6 shadow-glow backdrop-blur-xl transition hover:shadow-lg dark:border-white/10 dark:bg-zinc-900/60"
                    >
                      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                      <div className="flex items-center justify-between gap-3 border-b border-muted/55 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/20">
                            <Brain className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-display text-lg font-bold tracking-tight text-foreground">Trắc nghiệm tính cách</h3>
                            <p className="mt-0.5 text-xs text-muted-foreground">MBTI nhanh — chọn để đính kèm vào CV và gợi ý định hướng nghề.</p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          onClick={startTest}
                          variant="outline"
                          size="sm"
                          className="shrink-0 gap-1.5 rounded-xl border-primary/20 text-xs font-semibold hover:bg-primary/5 hover:text-primary"
                        >
                          <Brain className="h-3.5 w-3.5" />
                          {personalityResult ? "Làm lại" : "Làm trắc nghiệm"}
                        </Button>
                      </div>

                      <div className="mt-5">
                        {personalityResult ? (
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-4">
                              <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                <span className="text-xl font-extrabold uppercase tracking-wide">{personalityResult.result_code}</span>
                              </div>
                              <p className="max-w-md text-sm leading-relaxed text-muted-foreground">{personalityResult.summary}</p>
                            </div>
                            <label className="flex shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-muted/55 bg-muted/20 px-3 py-2 text-xs font-medium text-foreground">
                              <input
                                type="checkbox"
                                checked={personalityResult.include_in_cv}
                                onChange={(e) => handleToggleCv(personalityResult.id, e.target.checked)}
                                className="h-4 w-4 rounded border-border accent-primary"
                              />
                              Hiển thị trên CV
                            </label>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-muted/55 bg-muted/10 p-6 text-center">
                            <div className="mb-3 rounded-xl bg-muted/20 p-3 text-muted-foreground">
                              <Brain className="h-6 w-6 text-primary" />
                            </div>
                            <h4 className="mb-1 text-sm font-semibold text-foreground">Chưa có kết quả trắc nghiệm</h4>
                            <p className="mb-3 max-w-[280px] text-[11px] leading-normal text-muted-foreground">
                              Làm bài MBTI nhanh (4 câu) để hiểu điểm mạnh và đính kèm vào CV.
                            </p>
                            <Button onClick={startTest} variant="outline" size="sm" className="h-8 gap-1.5 rounded-lg border-primary/20 text-xs hover:bg-primary/5 hover:text-primary">
                              <Brain className="h-3.5 w-3.5" /> Làm trắc nghiệm tính cách
                            </Button>
                          </div>
                        )}
                      </div>
                    </motion.div>

                    {/* Layout Configuration Panel */}
                    <LayoutManager
                      order={cvProfile.sections_config?.order || ["basic", "summary", "education", "experience_skills", "certs_awards", "activities"]}
                      visibility={cvProfile.sections_config?.visibility || {}}
                      onSave={async (config) => {
                        await mutateCv("update_layout", { sections_config: config });
                      }}
                    />

                    {/* CV blocks shown one at a time as a step-by-step wizard
                        (full width, never side-by-side columns). */}
                    {(() => {
                      const order = cvProfile.sections_config?.order || ["basic", "summary", "education", "experience_skills", "certs_awards", "activities"];
                      const steps: WizardStep[] = order
                        .filter((sectionKey) => cvProfile.sections_config?.visibility?.[sectionKey] !== false)
                        .map((sectionKey): WizardStep | null => {
                          const content = (() => {
                            switch (sectionKey) {
                        case "basic":
                          return (
                            <SectionWrapper key="basic" title="1. Thông tin cơ bản" icon={<User className="h-5 w-5" />}>
                              <BasicInfoForm profile={cvProfile} onSave={handleSaveBasic} onUploadAvatar={handleCvAvatarUpload} />
                            </SectionWrapper>
                          );
                        case "summary":
                          return (
                            <SectionWrapper key="summary" title="2. Tóm tắt & Mục tiêu" icon={<Sparkles className="h-5 w-5" />}>
                              <SummaryForm profile={cvProfile} onSave={handleSaveSummary} />
                            </SectionWrapper>
                          );
                      case "education":
                        return (
                          <SectionWrapper
                            key="education"
                            title="3. Trình độ học vấn & Học bạ"
                            description="Khai báo các cấp học THCS/THPT và điểm số học bạ."
                            icon={<GraduationCap className="h-5 w-5" />}
                            onAdd={() => openAddDialog("education")}
                          >
                            {cvData.education.length === 0 ? (
                              <EmptyState
                                icon={<GraduationCap className="h-6 w-6 text-primary" />}
                                title="Chưa có thông tin học vấn"
                                description="Khai báo các cấp học THCS/THPT và điểm số học bạ để làm nổi bật hồ sơ học thuật."
                                actionText="Thêm học vấn"
                                onAction={() => openAddDialog("education")}
                              />
                            ) : (
                              <div className="divide-y divide-muted/40">
                                {cvData.education.map((edu) => (
                                  <div key={edu.id} className="group relative flex justify-between items-start py-3.5 first:pt-0 last:pb-0">
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm text-foreground">{edu.school_name}</span>
                                        <span className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                                          {edu.level}
                                        </span>
                                        {edu.is_current && (
                                          <span className="inline-flex rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                                            Đang học
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        Niên khóa: {edu.start_year || "?"} - {edu.is_current ? "Hiện tại" : edu.end_year || "?"}
                                      </p>
                                      <div className="flex gap-4 mt-2 text-xs text-foreground font-semibold">
                                        {edu.gpa && <span>GPA: {edu.gpa}</span>}
                                        {edu.grade_12 && <span>Lớp 12: {edu.grade_12}</span>}
                                        {edu.grade_11 && <span>Lớp 11: {edu.grade_11}</span>}
                                        {edu.grade_10 && <span>Lớp 10: {edu.grade_10}</span>}
                                      </div>
                                    </div>
                                    <div className="flex gap-1.5 opacity-80 group-hover:opacity-100 shrink-0">
                                      <Button
                                        onClick={() => openEditDialog("education", edu)}
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 rounded-xl p-0 hover:bg-primary/5 text-primary"
                                      >
                                        <Edit2 className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        onClick={() => edu.id && handleDeleteItem("education", edu.id)}
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 rounded-xl p-0 hover:bg-destructive/5 text-destructive"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </SectionWrapper>
                        );
                      case "experience_skills":
                        return (
                          <div key="experience_skills" className="space-y-6">
                            {/* Experiences */}
                            <SectionWrapper
                              title="4a. Kinh nghiệm & Dự án"
                              icon={<Briefcase className="h-5 w-5" />}
                              onAdd={() => openAddDialog("experience")}
                            >
                              {cvData.experiences.length === 0 ? (
                                <EmptyState
                                  icon={<Briefcase className="h-6 w-6 text-primary" />}
                                  title="Chưa có kinh nghiệm & dự án"
                                  description="Chia sẻ các công việc, hoạt động nghiên cứu khoa học hoặc dự án cá nhân bạn từng làm."
                                  actionText="Thêm kinh nghiệm"
                                  onAction={() => openAddDialog("experience")}
                                />
                              ) : (
                                <div className="divide-y divide-muted/40">
                                  {cvData.experiences.map((exp) => (
                                    <div key={exp.id} className="group relative flex justify-between items-start py-3 first:pt-0 last:pb-0">
                                      <div>
                                        <span className="font-bold text-xs text-foreground block">{exp.title}</span>
                                        {exp.organization && (
                                          <span className="text-[11px] text-muted-foreground block font-medium mt-0.5">{exp.organization}</span>
                                        )}
                                        <span className="inline-flex rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary mt-1 capitalize">
                                          {exp.type}
                                        </span>
                                        {exp.description && (
                                          <p className="text-[11px] text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">{exp.description}</p>
                                        )}
                                      </div>
                                      <div className="flex gap-1 opacity-80 group-hover:opacity-100 shrink-0 ml-2">
                                        <Button
                                          onClick={() => openEditDialog("experience", exp)}
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 w-7 rounded-lg p-0 hover:bg-primary/5 text-primary"
                                        >
                                          <Edit2 className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          onClick={() => exp.id && handleDeleteItem("experience", exp.id)}
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 w-7 rounded-lg p-0 hover:bg-destructive/5 text-destructive"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </SectionWrapper>

                            {/* Skills */}
                            <SectionWrapper
                              title="4b. Kỹ năng"
                              icon={<Layers className="h-5 w-5" />}
                              onAdd={() => openAddDialog("skill")}
                            >
                              {cvData.skills.length === 0 ? (
                                <EmptyState
                                  icon={<Layers className="h-6 w-6 text-primary" />}
                                  title="Chưa có kỹ năng"
                                  description="Khai báo các kỹ năng tin học, ngoại ngữ, hay kỹ năng chuyên môn hỗ trợ sớm công việc."
                                  actionText="Thêm kỹ năng"
                                  onAction={() => openAddDialog("skill")}
                                />
                              ) : (
                                <div className="space-y-3">
                                  {cvData.skills.map((skill) => (
                                    <div key={skill.id} className="group flex justify-between items-center rounded-xl bg-muted/30 p-2.5 border border-muted/40">
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-bold text-xs text-foreground truncate">{skill.name}</span>
                                          <span className="inline-block text-[9px] font-semibold text-muted-foreground capitalize">
                                            ({skill.category})
                                          </span>
                                        </div>
                                        <div className="flex gap-0.5 mt-1.5">
                                          {[1, 2, 3, 4, 5].map((dot) => (
                                            <div
                                              key={dot}
                                              className={`h-1.5 w-1.5 rounded-full ${
                                                dot <= skill.proficiency
                                                  ? "bg-primary"
                                                  : "bg-gray-200 dark:bg-zinc-800"
                                              }`}
                                            />
                                          ))}
                                        </div>
                                      </div>
                                      <div className="flex gap-0.5 opacity-80 group-hover:opacity-100 shrink-0 ml-2">
                                        <Button
                                          onClick={() => openEditDialog("skill", skill)}
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 rounded-lg p-0 hover:bg-primary/5 text-primary"
                                        >
                                          <Edit2 className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          onClick={() => skill.id && handleDeleteItem("skill", skill.id)}
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 rounded-lg p-0 hover:bg-destructive/5 text-destructive"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </SectionWrapper>
                          </div>
                        );
                      case "certs_awards":
                        return (
                          <div key="certs_awards" className="space-y-6">
                            {/* Certificates */}
                            <SectionWrapper
                              title="5a. Chứng chỉ"
                              icon={<Award className="h-5 w-5" />}
                              onAdd={() => openAddDialog("certificate")}
                            >
                              {cvData.certificates.length === 0 ? (
                                <EmptyState
                                  icon={<Award className="h-6 w-6 text-primary" />}
                                  title="Chưa có chứng chỉ"
                                  description="Đính kèm chứng chỉ IELTS, SAT, tin học văn phòng hoặc chứng chỉ năng lực học thuật khác."
                                  actionText="Thêm chứng chỉ"
                                  onAction={() => openAddDialog("certificate")}
                                />
                              ) : (
                                <div className="space-y-3">
                                  {cvData.certificates.map((cert) => (
                                    <div key={cert.id} className="group relative flex justify-between items-start rounded-xl bg-muted/30 p-3 border border-muted/40">
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-bold text-sm text-foreground">{cert.cert_type_code}</span>
                                          <span className="inline-flex rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-600">
                                            Điểm: {cert.score}
                                          </span>
                                          {cert.is_verified && (
                                            <span className="inline-flex rounded-full bg-blue-500/10 px-2 py-0.5 text-[9px] font-bold text-blue-600">
                                              Verified
                                            </span>
                                          )}
                                        </div>
                                        {cert.issued_date && (
                                          <span className="text-[10px] text-muted-foreground block mt-1.5">
                                            Cấp ngày: {new Date(cert.issued_date).toLocaleDateString("vi-VN")}
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex gap-0.5 opacity-80 group-hover:opacity-100 shrink-0 ml-2">
                                        <Button
                                          onClick={() => openEditDialog("certificate", cert)}
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 w-7 rounded-lg p-0 hover:bg-primary/5 text-primary"
                                        >
                                          <Edit2 className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          onClick={() => cert.id && handleDeleteItem("certificate", cert.id)}
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 w-7 rounded-lg p-0 hover:bg-destructive/5 text-destructive"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </SectionWrapper>

                            {/* Awards */}
                            <SectionWrapper
                              title="5b. Giải thưởng"
                              icon={<Trophy className="h-5 w-5" />}
                              onAdd={() => openAddDialog("award")}
                            >
                              {cvData.awards.length === 0 ? (
                                <EmptyState
                                  icon={<Trophy className="h-6 w-6 text-primary" />}
                                  title="Chưa có giải thưởng"
                                  description="Khai báo các giải học sinh giỏi, cuộc thi năng khiếu, học thuật bạn đã xuất sắc đạt được."
                                  actionText="Thêm giải thưởng"
                                  onAction={() => openAddDialog("award")}
                                />
                              ) : (
                                <div className="divide-y divide-muted/40">
                                  {cvData.awards.map((award) => (
                                    <div key={award.id} className="group relative flex justify-between items-start py-3 first:pt-0 last:pb-0">
                                      <div>
                                        <span className="font-bold text-xs text-foreground block">{award.title}</span>
                                        <div className="flex gap-2 items-center mt-1">
                                          {award.rank && <span className="text-[10px] text-foreground font-semibold">{award.rank}</span>}
                                          <span className="inline-flex rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-600 uppercase">
                                            {award.level}
                                          </span>
                                        </div>
                                        {(award.issuer || award.award_year) && (
                                          <span className="text-[10px] text-muted-foreground block mt-1">
                                            {award.issuer} {award.award_year ? `(${award.award_year})` : ""}
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex gap-1 opacity-80 group-hover:opacity-100 shrink-0 ml-2">
                                        <Button
                                          onClick={() => openEditDialog("award", award)}
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 w-7 rounded-lg p-0 hover:bg-primary/5 text-primary"
                                        >
                                          <Edit2 className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          onClick={() => award.id && handleDeleteItem("award", award.id)}
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 w-7 rounded-lg p-0 hover:bg-destructive/5 text-destructive"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </SectionWrapper>
                          </div>
                        );
                      case "activities":
                        return (
                          <SectionWrapper
                            key="activities"
                            title="6. Hoạt động ngoại khóa"
                            icon={<Heart className="h-5 w-5" />}
                            onAdd={() => openAddDialog("activity")}
                          >
                            {cvData.activities.length === 0 ? (
                              <EmptyState
                                icon={<Heart className="h-6 w-6 text-primary" />}
                                title="Chưa có hoạt động ngoại khóa"
                                description="Các hoạt động tình nguyện, câu lạc bộ, đoàn đội giúp bạn thể hiện sự tích cực, năng động."
                                actionText="Thêm hoạt động"
                                onAction={() => openAddDialog("activity")}
                              />
                            ) : (
                              <div className="divide-y divide-muted/40">
                                {cvData.activities.map((act) => (
                                  <div key={act.id} className="group relative flex justify-between items-start py-3.5 first:pt-0 last:pb-0">
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm text-foreground">{act.title}</span>
                                        {act.role && (
                                          <span className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                                            {act.role}
                                          </span>
                                        )}
                                        {act.hours && (
                                          <span className="inline-flex rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold text-indigo-600">
                                            {act.hours} giờ
                                          </span>
                                        )}
                                      </div>
                                      {act.organization && (
                                        <p className="text-xs text-muted-foreground font-semibold mt-1">Tổ chức: {act.organization}</p>
                                      )}
                                      {(act.start_date || act.end_date) && (
                                        <p className="text-[10px] text-muted-foreground mt-0.5">
                                          Thời gian: {act.start_date || "?"} - {act.end_date || "Hiện tại"}
                                        </p>
                                      )}
                                      {act.description && (
                                        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{act.description}</p>
                                      )}
                                    </div>
                                    <div className="flex gap-1.5 opacity-80 group-hover:opacity-100 shrink-0">
                                      <Button
                                        onClick={() => openEditDialog("activity", act)}
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 rounded-xl p-0 hover:bg-primary/5 text-primary"
                                      >
                                        <Edit2 className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        onClick={() => act.id && handleDeleteItem("activity", act.id)}
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 rounded-xl p-0 hover:bg-destructive/5 text-destructive"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </SectionWrapper>
                        );
                        case "personality":
                          return (
                            <SectionWrapper
                              key="personality"
                              title="7. Trắc nghiệm tính cách"
                              description="Kết quả trắc nghiệm tính cách được chọn để gắn vào CV."
                              icon={<Brain className="h-5 w-5 text-primary" />}
                            >
                              {personalityResult ? (
                                <div className="rounded-xl bg-muted/30 p-4 border border-muted/50">
                                  <div className="flex justify-between items-start">
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2">
                                        <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary uppercase">
                                          MBTI: {personalityResult.result_code}
                                        </span>
                                      </div>
                                      <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                                        {personalityResult.summary}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 cursor-pointer bg-white dark:bg-zinc-800 border border-muted/50 px-2.5 py-1.5 rounded-lg select-none hover:bg-muted/10">
                                        <input
                                          type="checkbox"
                                          checked={personalityResult.include_in_cv}
                                          onChange={async (e) => {
                                            const val = e.target.checked;
                                            await handleToggleCv(personalityResult.id, val);
                                          }}
                                          className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                                        />
                                        Gắn vào CV
                                      </label>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <EmptyState
                                  icon={<Brain className="h-6 w-6 text-primary" />}
                                  title="Chưa có kết quả trắc nghiệm"
                                  description="Khám phá tính cách của bạn qua bài trắc nghiệm trắc sinh MBTI nhanh để đính kèm kết quả trực tiếp."
                                  actionText="Làm trắc nghiệm tính cách"
                                  onAction={startTest}
                                />
                              )}
                            </SectionWrapper>
                          );
                              default:
                                return null;
                            }
                          })();
                          return content
                            ? { key: sectionKey, title: SECTION_TITLES[sectionKey] ?? sectionKey, content }
                            : null;
                        })
                        .filter((s): s is WizardStep => s !== null);
                      return <CvSectionWizard steps={steps} />;
                    })()}
                </div>
              )})()}
            </div>
            
          </div>
        </motion.div>
      </div>

      {/* Dynamic Item Form Modal */}
      <ItemDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSaveItem}
        type={dialogType}
        item={selectedItem}
      />

      {/* Personality Test Modal */}
      {isTestingPersonality && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-lg rounded-2xl border border-white/20 bg-background p-6 shadow-glow backdrop-blur-xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" /> Trắc nghiệm tính cách MBTI
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsTestingPersonality(false)}
                className="h-8 w-8 p-0 rounded-xl hover:bg-muted"
                disabled={submittingTest}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {loadingQuestions ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-2 text-sm text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span>Đang tải câu hỏi...</span>
              </div>
            ) : questions.length > 0 ? (() => {
              const currentQuestion = questions[currentQuestionIdx];
              const progress = (currentQuestionIdx / questions.length) * 100;
              return (
                <div className="space-y-6">
                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground font-semibold">
                      <span>Câu hỏi {currentQuestionIdx + 1}/{questions.length}</span>
                      <span>{Math.round(progress)}% hoàn thành</span>
                    </div>
                    <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <p className="text-base font-semibold text-foreground leading-relaxed min-h-[56px]">
                    {currentQuestion.question_text}
                  </p>

                  <div className="grid grid-cols-1 gap-3">
                    <button
                      type="button"
                      onClick={() => handleAnswerSelect("a")}
                      disabled={submittingTest}
                      className="group flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3.5 text-left text-sm font-semibold transition hover:border-primary hover:bg-primary/5 disabled:opacity-50 w-full"
                    >
                      <span className="pr-4">{currentQuestion.option_a}</span>
                      <span className="text-primary opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAnswerSelect("b")}
                      disabled={submittingTest}
                      className="group flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3.5 text-left text-sm font-semibold transition hover:border-primary hover:bg-primary/5 disabled:opacity-50 w-full"
                    >
                      <span className="pr-4">{currentQuestion.option_b}</span>
                      <span className="text-primary opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                    </button>
                  </div>

                  {submittingTest && (
                    <div className="flex items-center gap-2 justify-center text-xs text-muted-foreground mt-4">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> Đang tính toán kết quả...
                    </div>
                  )}
                </div>
              );
            })() : (
              <p className="text-sm text-muted-foreground text-center py-6">Không tìm thấy câu hỏi.</p>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
