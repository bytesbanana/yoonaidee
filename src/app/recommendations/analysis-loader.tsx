"use client";

import { useEffect, useState, type ReactNode } from "react";
import { lineAuthHeaders } from "@/lib/line/liff-auth";
import { useLiff } from "../providers/LiffProvider";

type LoadState<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded"; data: T };

export function AnalysisLoader<T>({ query, children }: {
  query: string;
  children: (data: T) => ReactNode;
}) {
  const { liffObject, liffError, isReady } = useLiff();
  const [state, setState] = useState<LoadState<T>>({ status: "loading" });

  useEffect(() => {
    if (!isReady || !liffObject?.isLoggedIn()) return;

    const controller = new AbortController();
    async function load() {
      try {
        const headers = lineAuthHeaders(liffObject);
        const response = await fetch(`/api/analyses?${query}`, {
          headers: headers ?? undefined,
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await response.json();
        if (!controller.signal.aborted) {
          setState(response.ok
            ? { status: "loaded", data }
            : { status: "error", message: data.error });
        }
      } catch {
        if (!controller.signal.aborted) {
          setState({ status: "error", message: "Could not load your analysis. Try reopening this page." });
        }
      }
    }

    void load();
    return () => controller.abort();
  }, [isReady, liffObject, query]);

  if (liffError) return <p className="mt-4" role="alert">Open this page from LINE to access your analysis.</p>;
  if (isReady && liffObject && !liffObject.isLoggedIn()) {
    return (
      <button type="button" className="mt-4 rounded-xl bg-[#164334] px-4 py-3 text-white"
        onClick={() => liffObject.login({ redirectUri: window.location.href })}>
        Sign in with LINE
      </button>
    );
  }
  if (state.status === "loading") return <p className="mt-4" role="status">Loading analysis…</p>;
  if (state.status === "error") return <p className="mt-4" role="alert">{state.message}</p>;
  return children(state.data);
}
