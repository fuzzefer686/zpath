"use client";

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
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/zpath/AuthProvider";
import { useProfile, type ProfileData } from "@/hooks/useProfile";

export function ProfilePage() {
  const { openAuthPrompt } = useAuth();
  const { profile, isLoading, error, updateProfile, uploadAvatar } = useProfile();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [school, setSchool] = useState("");
  const [grade, setGrade] = useState("");
  const [targetUniversity, setTargetUniversity] = useState("");
  
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sync profile data when loaded
  useEffect(() => {
    if (profile) {
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
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
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
    } catch (err: any) {
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

  const cardVariants: any = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
    },
  };

  if (isLoading && !profile) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center bg-zpath-gradient text-foreground">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 text-sm font-medium text-muted-foreground animate-pulse">
          Đang tải thông tin cá nhân...
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
    <div className="relative min-h-screen bg-zpath-gradient px-4 py-12 md:px-8">
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

      <div className="mx-auto max-w-4xl">
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
                Tùy chỉnh thông tin học tập của bạn để cải thiện gợi ý từ AI Advisor.
              </p>
            </div>
            
            <Link href="/advisor">
              <Button variant="outline" className="rounded-xl border-primary/20 hover:bg-primary/5">
                Quay lại Khảo sát
              </Button>
            </Link>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive"
            >
              {error}
            </motion.div>
          )}

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

            {/* Right Column: Editable Profile fields */}
            <div className="md:col-span-2 space-y-6">
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

              {/* Learning stats & MBTI card (Read-only for display context) */}
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
                  <div className="rounded-xl bg-muted/40 p-4 border border-muted/50">
                    <span className="block text-xs font-semibold text-muted-foreground">MBTI</span>
                    <span className="mt-1 block text-2xl font-extrabold text-primary uppercase">
                      {profile.sbti || "Chưa có"}
                    </span>
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
            
          </div>
        </motion.div>
      </div>
    </div>
  );
}
