import type { ReactNode } from "react";
import { RecommendationsShell } from "./recommendations-shell";

export default function RecommendationsLayout({ children }: { children: ReactNode }) {
  return <RecommendationsShell>{children}</RecommendationsShell>;
}
