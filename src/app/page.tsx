import { RecommendationsHome, recommendationsMetadata } from "./recommendations/recommendations-home";
import { RecommendationsShell } from "./recommendations/recommendations-shell";

export const metadata = recommendationsMetadata;

export default function Home() {
  return (
    <RecommendationsShell>
      <RecommendationsHome />
    </RecommendationsShell>
  );
}
