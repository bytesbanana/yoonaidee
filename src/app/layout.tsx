import { Geist, Geist_Mono } from "next/font/google";
import { QueryProvider } from "@/components/query-provider";
import type { Metadata } from "next";
import { siteDescription } from "@/lib/i18n";
import { LanguageProvider } from "./providers/language-provider";
import { LiffProvider } from "./providers/LiffProvider";
import { TranslationLoading } from "./providers/translation-loading";
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
  description: siteDescription,
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
            <QueryProvider>
              <TranslationLoading>{children}</TranslationLoading>
            </QueryProvider>
          </LiffProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
