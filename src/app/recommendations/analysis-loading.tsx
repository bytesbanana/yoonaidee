"use client";

import { useLanguage } from "../providers/language-provider";

export function AnalysisLoading({ zone = false }: { zone?: boolean }) {
  const { t } = useLanguage();
  return (
    <div className="grid min-h-[calc(100dvh-8rem)] place-items-center">
      <div role="status" className="flex flex-col items-center gap-4 text-[#164334]">
        <span aria-hidden="true" className="size-10 rounded-full border-4 border-[#c8d9cb] border-t-[#164334] motion-safe:animate-spin" />
        <p className="text-sm font-medium">{t(zone ? "Loading zone analysis…" : "Loading recommendations…")}</p>
      </div>
    </div>
  );
}
