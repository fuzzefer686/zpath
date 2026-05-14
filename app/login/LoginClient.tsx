'use client';

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { supabase } from "../lib/supabase";

const sanitizeNextPath = (value: string | null) => {
  if (!value) return "/";
  // only allow internal paths to avoid open redirects
  if (!value.startsWith("/")) return "/";
  if (value.startsWith("//")) return "/";
  return value;
};

const normalizeSiteUrl = (value: string | undefined) => {
  if (!value) return null;
  return value.replace(/\/+$/, "");
};

const getAuthRedirectOrigin = () => {
  const configuredSiteUrl = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  const currentOrigin = window.location.origin;

  if (
    configuredSiteUrl &&
    (currentOrigin.includes("localhost") || process.env.NODE_ENV === "production")
  ) {
    return configuredSiteUrl;
  }

  return currentOrigin;
};

export function LoginClient() {
  const searchParams = useSearchParams();

  const handleGoogleLogin = async () => {
    const nextPath = sanitizeNextPath(searchParams.get("next"));
    const redirectOrigin = getAuthRedirectOrigin();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${redirectOrigin}${nextPath}`,
      },
    });

    if (error) {
      console.error("Lỗi đăng nhập:", error.message);
      alert("Có lỗi xảy ra khi đăng nhập!");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 md:p-12 rounded-3xl shadow-lg border border-gray-100 max-w-md w-full text-center relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-zpath-gradient"></div>

        <h1 className="text-3xl font-black text-transparent bg-clip-text bg-zpath-gradient tracking-tighter mb-2">
          ZPATH.
        </h1>
        <p className="text-gray-600 font-medium mb-8">
          Đăng nhập để lưu lại hành trình định hướng tương lai của bạn.
        </p>

        <button
          onClick={handleGoogleLogin}
          className="w-full bg-white border-2 border-gray-200 text-gray-700 font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 hover:bg-gray-50 hover:border-zpath-primary transition-all group"
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Tiếp tục với Google
        </button>

        <p className="mt-8 text-sm text-gray-400">
          Chỉ với 1 click, không cần nhớ mật khẩu. <br />
          Hệ thống được bảo mật bởi{" "}
          <span className="font-semibold text-gray-500 flex items-center justify-center gap-1 inline-flex">
            <Sparkles size={14} /> ZPATH AI
          </span>
        </p>
      </motion.div>
    </div>
  );
}
