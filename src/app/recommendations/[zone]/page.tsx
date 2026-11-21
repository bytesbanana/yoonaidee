import { pageTitles } from "@/lib/i18n";
import { Suspense } from "react";
import Loading from "./loading";
import { ZoneAnalysis } from "./zone-analysis";

export const metadata = { title: pageTitles.zone };

export default function ZonePage() {
  return (
    <Suspense fallback={<Loading />}>
      <ZoneAnalysis />
    </Suspense>
  );
}
