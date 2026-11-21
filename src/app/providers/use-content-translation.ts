"use client";

import { useQuery } from "@tanstack/react-query";
import { translateContentLabel } from "@/lib/i18n";
import { lineAuthHeaders } from "@/lib/line/liff-auth";
import { maxTranslationCharacters, maxTranslationItems } from "@/lib/translation-batch";
import { useLiff } from "./LiffProvider";
import { useLanguage } from "./language-provider";

export function useContentTranslation(texts: (string | null | undefined)[]) {
  const { language, t } = useLanguage();
  const { liffObject } = useLiff();
  const candidates = [...new Set(texts.flatMap((text) => text?.trim() || []))].filter((text) => {
    if (/^(?:[a-z][a-z0-9+.-]*:\/\/|www\.)/i.test(text) || /^(?:BTS|MRT|SRT|ARL|BRT)(?:[ /,+&]+(?:BTS|MRT|SRT|ARL|BRT))*$/i.test(text)) return false;
    if (translateContentLabel(language, text) !== text) return false;
    return language === "en" ? /\p{Script=Thai}/u.test(text) : /\p{Script=Latin}/u.test(text);
  }).sort();
  const query = useQuery({
    queryKey: ["content-translations", language, candidates],
    enabled: candidates.length > 0 && Boolean(liffObject?.isLoggedIn()),
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
    async queryFn({ signal }) {
      const headers = lineAuthHeaders(liffObject);
      if (!headers) throw new Error("LINE authentication unavailable");

      const translations = new Map<string, string>();
      let batch: string[] = [];
      let length = 0;

      async function translateBatch(texts: string[]) {
        const response = await fetch("/api/translations", {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ language, texts }),
          signal,
        });
        if (!response.ok) throw new Error("Translation unavailable");

        const { translations: localized } = await response.json() as { translations: string[] };
        texts.forEach((text, index) => translations.set(text, localized[index]));
      }

      for (const text of candidates) {
        if (text.length > maxTranslationCharacters) continue;
        if (batch.length === maxTranslationItems || length + text.length > maxTranslationCharacters) {
          await translateBatch(batch);
          batch = [];
          length = 0;
        }
        batch.push(text);
        length += text.length;
      }
      if (batch.length) await translateBatch(batch);
      return translations;
    },
  });

  return {
    localize: (text: string) => query.data?.get(text.trim()) ?? translateContentLabel(language, text),
    status: query.isFetching ? t("Translating…")
      : query.isError ? t("Translation unavailable. Showing original text.")
        : "",
  };
}
