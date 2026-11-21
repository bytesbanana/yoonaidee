import { Geist, Geist_Mono } from "next/font/google";
import { QueryProvider } from "@/components/query-provider";
import type { Metadata } from "next";
import { LanguageProvider } from "./providers/language-provider";
import { LiffProvider } from "./providers/LiffProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Yoo Nai Dee", template: "%s | Yoo Nai Dee" },
  description: "See your latest Bangkok neighborhood recommendations.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LanguageProvider>
          <LiffProvider>
            <QueryProvider>{children}</QueryProvider>
          </LiffProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
