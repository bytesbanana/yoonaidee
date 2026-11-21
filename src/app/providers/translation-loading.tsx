"use client";

import { useIsFetching } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useLanguage } from "./language-provider";
import { contentTranslationQueryKey } from "./use-content-translation";

export function TranslationLoading({ children }: { children: ReactNode }) {
  const { language, t } = useLanguage();
  const isTranslating = useIsFetching({ queryKey: [contentTranslationQueryKey, language] }) > 0;

  return (
    <>
      {isTranslating && (
        <main className="grid flex-1 place-items-center bg-[#f8f7f2] px-4 text-[#164334] [font-family:var(--font-geist-sans),sans-serif]">
          <div role="status" className="flex flex-col items-center gap-4">
            <span aria-hidden="true" className="size-10 rounded-full border-4 border-[#c8d9cb] border-t-[#164334] motion-safe:animate-spin" />
            <p className="text-sm font-medium">{t("Translating…")}</p>
          </div>
        </main>
      )}
      {/* Keep the page mounted so its queries and in-progress edits survive translation. */}
      <div className={isTranslating ? "hidden" : "contents"}>{children}</div>
    </>
  );
}
