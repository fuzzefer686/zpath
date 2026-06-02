"use client";

import { useEffect, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Loader2, Phone } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/zpath/AuthProvider";

type CompleteProfileResponse = {
  error?: string;
};

const sanitizeNextPath = (value: string | null) => {
  if (!value) return "/";
  if (!value.startsWith("/")) return "/";
  if (value.startsWith("//")) return "/";
  return value;
};

export function CompleteProfileClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading, reloadAuth } = useAuth();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nextPath = sanitizeNextPath(searchParams.get("next"));

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
      return;
    }

    if (user.phone) {
      router.replace(nextPath);
    }
  }, [isLoading, nextPath, router, user]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/complete-profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = (await response.json()) as CompleteProfileResponse;

      if (!response.ok) {
        throw new Error(data.error || "Không thể cập nhật số điện thoại.");
      }

      await reloadAuth();
      router.replace(nextPath);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Không thể cập nhật số điện thoại.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-lg md:p-12"
      >
        <div className="absolute left-0 top-0 h-2 w-full bg-zpath-gradient" />
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Phone className="h-6 w-6" />
        </div>

        <h1 className="mb-2 text-2xl font-black tracking-tight text-gray-950">
          Hoàn tất hồ sơ
        </h1>
        <p className="mb-8 text-sm font-medium leading-6 text-gray-600">
          Nhập số điện thoại để sử dụng UniMap và Advisor.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5 text-left">
          <label className="block text-sm font-semibold">
            Số điện thoại
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              type="tel"
              autoComplete="tel"
              className="mt-2 h-11 w-full rounded-xl border-2 border-input bg-background px-3 text-sm outline-none focus:border-primary"
              placeholder="vd: +84 912 345 678"
              required
            />
          </label>

          {error ? (
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
              {error}
            </div>
          ) : null}

          <Button type="submit" variant="hero" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Lưu và tiếp tục
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
