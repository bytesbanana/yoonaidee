import { pageTitles } from "@/lib/i18n";
import { SettingsView } from "../settings/settings-view";

export const metadata = { title: pageTitles.profile };

export default function ProfilePage() {
  return <SettingsView showProfile />;
}
