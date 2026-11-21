"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { SavedAnalysis } from "@/lib/analyses/result";
import { lineAuthHeaders } from "@/lib/line/liff-auth";
import { useLiff } from "../providers/LiffProvider";
import { useLanguage } from "../providers/language-provider";
import { AnalysisLoading } from "./analysis-loading";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded"; analysis: SavedAnalysis | null };

const loadError = "Could not load your analysis. Try reopening this page.";

export function AnalysisLoader({ resultId = null, zone = false, header, children }: {
  resultId?: string | null;
  zone?: boolean;
  header: ReactNode;
  children: (analysis: SavedAnalysis | null) => ReactNode;
}) {
  const { t } = useLanguage();
  const { liffObject, liffError, isReady } = useLiff();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    if (!isReady || !liffObject?.isLoggedIn()) return;

    const controller = new AbortController();
    async function load() {
      try {
        const headers = lineAuthHeaders(liffObject);
        const query = resultId === null ? "" : `?${new URLSearchParams({ result: resultId })}`;
        const response = await fetch(`/api/analyses${query}`, {
          headers: headers ?? undefined,
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await response.json();
        if (!controller.signal.aborted) {
          setState(response.ok
            ? { status: "loaded", analysis: data.analysis }
            : { status: "error", message: data.error ?? loadError });
        }
      } catch {
        if (!controller.signal.aborted) setState({ status: "error", message: loadError });
      }
    }

    void load();
    return () => controller.abort();
  }, [isReady, liffObject, resultId]);

  const needsLogin = isReady && liffObject && !liffObject.isLoggedIn();
  if (!liffError && !needsLogin && state.status === "loading") return <AnalysisLoading zone={zone} />;

  return (
    <>
      {header}
      {liffError ? <p className="mt-4" role="alert">{t("Open this page from LINE to access your analysis.")}</p>
        : needsLogin ? (
          <button type="button" className="mt-4 rounded-xl bg-[#164334] px-4 py-3 text-white"
            onClick={() => liffObject.login({ redirectUri: window.location.href })}>
            {t("Sign in with LINE")}
          </button>
        ) : state.status === "error" ? <p className="mt-4" role="alert">{t(state.message)}</p>
          : state.status === "loaded" && children(state.analysis)}
    </>
  );
}
