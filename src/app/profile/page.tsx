import type { Metadata } from "next";
import { SettingsView } from "../settings/settings-view";

export const metadata: Metadata = {
  title: "Your profile | Yoo Nai Dee",
};

export default function ProfilePage() {
  return <SettingsView showProfile />;
}
