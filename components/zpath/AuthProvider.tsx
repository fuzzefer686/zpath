"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Loader2, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

const AUTH_FEATURE_ENABLED = false;

export type AuthUser = {
  id: string;
  username: string;
  role: "admin" | "user";
};

type AuthResponse = {
  user?: AuthUser | null;
  surveyCompleted?: boolean;
  error?: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  surveyCompleted: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  reloadAuth: () => Promise<void>;
  markSurveyCompleted: () => void;
  openAuthPrompt: () => void;
  closeAuthPrompt: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [surveyCompleted, setSurveyCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [, setAuthPromptDismissed] = useState(false);

  const reloadAuth = useCallback(async () => {
    if (!AUTH_FEATURE_ENABLED) {
      setUser(null);
      setSurveyCompleted(false);
      setAuthPromptOpen(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" });

      if (!response.ok) {
        setUser(null);
        setSurveyCompleted(false);
        return;
      }

      const data = (await response.json()) as AuthResponse;
      setUser(data.user ?? null);
      setSurveyCompleted(Boolean(data.surveyCompleted));
    } catch (error) {
      console.error("Cannot load auth state:", error);
      setUser(null);
      setSurveyCompleted(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!AUTH_FEATURE_ENABLED) return;

    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void reloadAuth();
    });

    return () => {
      cancelled = true;
    };
  }, [reloadAuth]);

  const submitCredentials = useCallback(
    async (endpoint: "/api/auth/login" | "/api/auth/register", username: string, password: string) => {
      if (!AUTH_FEATURE_ENABLED) {
        throw new Error("Tính năng đăng nhập đang tạm tắt.");
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = (await response.json()) as AuthResponse;

      if (!response.ok || !data.user) {
        throw new Error(data.error || "Không thể xác thực tài khoản.");
      }

      setUser(data.user);
      setSurveyCompleted(Boolean(data.surveyCompleted));
      setAuthPromptOpen(false);
      setAuthPromptDismissed(false);

    },
    [],
  );

  const login = useCallback(
    (username: string, password: string) =>
      submitCredentials("/api/auth/login", username, password),
    [submitCredentials],
  );

  const register = useCallback(
    (username: string, password: string) =>
      submitCredentials("/api/auth/register", username, password),
    [submitCredentials],
  );

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setSurveyCompleted(false);
    setAuthPromptDismissed(false);
    if (pathname !== "/") router.push("/");
    router.refresh();
  }, [pathname, router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      surveyCompleted,
      isLoading,
      login,
      register,
      logout,
      reloadAuth,
      markSurveyCompleted: () => setSurveyCompleted(true),
      openAuthPrompt: () => {
        if (!AUTH_FEATURE_ENABLED) return;
        setAuthPromptDismissed(false);
        setAuthPromptOpen(true);
      },
      closeAuthPrompt: () => {
        setAuthPromptOpen(false);
        setAuthPromptDismissed(true);
      },
    }),
    [isLoading, login, logout, register, reloadAuth, surveyCompleted, user],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <AuthPromptModal open={authPromptOpen} />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}

export function AuthForm({
  onSuccess,
  compact = false,
}: {
  onSuccess?: () => void;
  compact?: boolean;
}) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (mode === "login") {
        await login(username, password);
      } else {
        await register(username, password);
      }

      onSuccess?.();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Không thể xác thực tài khoản.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={compact ? "space-y-4" : "space-y-5"}>
      <div className="grid grid-cols-2 rounded-lg bg-muted p-1 text-sm font-semibold">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`rounded-md px-3 py-2 ${mode === "login" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
        >
          Đăng nhập
        </button>
        <button
          type="button"
          onClick={() => setMode("register")}
          className={`rounded-md px-3 py-2 ${mode === "register" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
        >
          Tạo tài khoản
        </button>
      </div>

      <label className="block text-left text-sm font-semibold">
        Tên đăng nhập
        <input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="username"
          className="mt-2 h-11 w-full rounded-xl border-2 border-input bg-background px-3 text-sm outline-none focus:border-primary"
          placeholder="vd: minh_anh"
        />
      </label>

      <label className="block text-left text-sm font-semibold">
        Mật khẩu
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          className="mt-2 h-11 w-full rounded-xl border-2 border-input bg-background px-3 text-sm outline-none focus:border-primary"
          placeholder="Ít nhất 8 ký tự"
        />
      </label>

      {error ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {error}
        </div>
      ) : null}

      <Button type="submit" variant="hero" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
      </Button>
    </form>
  );
}

function AuthPromptModal({ open }: { open: boolean }) {
  const { closeAuthPrompt } = useAuth();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/40 px-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border bg-background p-6 shadow-xl">
        <button
          type="button"
          onClick={closeAuthPrompt}
          className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Đóng"
        >
          <X className="h-5 w-5" />
        </button>
        <h2 className="pr-8 font-display text-2xl font-bold">
          Đăng nhập để lưu kết quả ZPath
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Bạn có thể xem trang này, nhưng cần đăng nhập và hoàn thành khảo sát để dùng đầy đủ tính năng.
        </p>
        <div className="mt-6">
          <AuthForm compact />
        </div>
      </div>
    </div>
  );
}
