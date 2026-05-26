"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { AuthForm, useAuth } from "@/components/zpath/AuthProvider";

const sanitizeNextPath = (value: string | null) => {
  if (!value) return "/";
  if (!value.startsWith("/")) return "/";
  if (value.startsWith("//")) return "/";
  return value;
};

export function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, surveyCompleted } = useAuth();
  const nextPath = sanitizeNextPath(searchParams.get("next"));

  useEffect(() => {
    if (!user) return;

    if (surveyCompleted) {
      router.replace(nextPath);
      return;
    }

    router.replace(`/survey?next=${encodeURIComponent(nextPath)}`);
  }, [nextPath, router, surveyCompleted, user]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-lg md:p-12"
      >
        <div className="absolute left-0 top-0 h-2 w-full bg-zpath-gradient" />

        <h1 className="mb-2 bg-zpath-gradient bg-clip-text text-3xl font-black tracking-tighter text-transparent">
          ZPATH.
        </h1>
        <p className="mb-8 font-medium text-gray-600">
          Đăng nhập để lưu kết quả khảo sát và mở khóa các tính năng ZPath.
        </p>

        <AuthForm />

        <p className="mt-8 text-sm text-gray-400">
          Tài khoản được bảo vệ bằng mật khẩu và phiên đăng nhập bảo mật. <br />
          <span className="inline-flex items-center justify-center gap-1 font-semibold text-gray-500">
            <Sparkles size={14} /> ZPATH AI
          </span>
        </p>
      </motion.div>
    </div>
  );
}
