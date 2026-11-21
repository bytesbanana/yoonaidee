import { Suspense } from "react";
import type { Metadata } from "next";
import { ZoneAnalysis } from "./zone-analysis";

export const metadata: Metadata = { title: "Zone analysis | Yoo Nai Dee" };

export default function ZonePage() {
  return (
    <Suspense fallback={<p role="status">Loading zone analysis…</p>}>
      <ZoneAnalysis />
    </Suspense>
  );
}
