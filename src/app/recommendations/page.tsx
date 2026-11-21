import { pageTitles } from "@/lib/i18n";
import { RecommendationsHome } from "./recommendations-home";

export const metadata = { title: pageTitles.recommendations };

export default function RecommendationsPage() {
  return <RecommendationsHome />;
}
