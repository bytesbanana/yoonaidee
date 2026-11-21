import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { StayPlanner } from "./stay-planner";

export const metadata: Metadata = {
  title: "Plan a short stay | Yoo Nai Dee",
  description: "Compare sample rent for your dates and check routes to your next assignment in Bangkok.",
};

export default function RecommendationsPage() {
  return (
    <>
      <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-[#164334] hover:underline focus-visible:outline-offset-4">
        <ArrowLeft aria-hidden="true" className="size-4" />
        Home
      </Link>
      <Suspense fallback={<p className="mt-8" role="status">Loading stay planner…</p>}>
        <StayPlanner />
      </Suspense>
    </>
  );
}
