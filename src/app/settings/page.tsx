import { pageTitles } from "@/lib/i18n";
import { SettingsView } from "./settings-view";

export const metadata = { title: pageTitles.settings };

export default function SettingsPage() {
  return <SettingsView />;
}
