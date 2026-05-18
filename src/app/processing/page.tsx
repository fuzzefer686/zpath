import { Suspense } from "react";
import { Loader2 } from "lucide-react";

import { ProcessingClient } from "./ProcessingClient";

function ProcessingFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <div className="max-w-md text-center">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
        <h1 className="mt-6 text-2xl font-bold">
          ZPath đang phân tích hồ sơ của bạn...
        </h1>
      </div>
    </main>
  );
}

export default function ProcessingPage() {
  return (
    <Suspense fallback={<ProcessingFallback />}>
      <ProcessingClient />
    </Suspense>
  );
}
