import type { Metadata } from "next";
import { SettingsView } from "./settings-view";

export const metadata: Metadata = {
  title: "Housing preferences | Yoo Nai Dee",
};

export default function SettingsPage() {
  return <SettingsView liffId={process.env.NEXT_PUBLIC_LIFF_ID ?? ""} />;
}
