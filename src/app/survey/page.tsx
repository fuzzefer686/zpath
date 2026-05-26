import { Suspense } from "react";

import { SurveyClient } from "./SurveyClient";

export default function SurveyPage() {
  return (
    <Suspense fallback={null}>
      <SurveyClient />
    </Suspense>
  );
}
