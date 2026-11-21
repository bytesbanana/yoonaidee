import { pageTitles } from "@/lib/i18n";
import { RecommendationsHome } from "./recommendations/recommendations-home";
import { RecommendationsShell } from "./recommendations/recommendations-shell";

export const metadata = { title: { absolute: `${pageTitles.recommendations} | Yoo Nai Dee` } };

export default function Home() {
  return (
    <RecommendationsShell>
      <RecommendationsHome />
    </RecommendationsShell>
  );
}
