import { Suspense } from "react";

import { CompleteProfileClient } from "./CompleteProfileClient";

export default function CompleteProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 text-sm font-semibold text-gray-600">
          Đang tải...
        </div>
      }
    >
      <CompleteProfileClient />
    </Suspense>
  );
}
