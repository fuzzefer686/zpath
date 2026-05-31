import { Suspense } from "react";

import { LoginClient } from "./LoginClient";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 text-sm font-semibold text-gray-600">
          Đang tải...
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  );
}
