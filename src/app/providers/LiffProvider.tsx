"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Liff = typeof import("@line/liff").default;

interface LiffContextType {
  liffObject: Liff | null;
  liffError: string | null;
  isReady: boolean;
}

const LiffContext = createContext<LiffContextType>({
  liffObject: null,
  liffError: null,
  isReady: false,
});

export const useLiff = () => useContext(LiffContext);

// LIFF can only be initialized once per page load. Share one init promise so
// React StrictMode double-effects (and multiple consumers) never call init twice.
let liffInitPromise: Promise<Liff> | null = null;

function initLiff(liffId: string): Promise<Liff> {
  if (!liffInitPromise) {
    liffInitPromise = import("@line/liff")
      .then(({ default: liff }) =>
        liff.init({
          liffId,
          withLoginOnExternalBrowser: true,
        })
      )
      .then(() => import("@line/liff").then(({ default: liff }) => liff))
      .catch((error) => {
        liffInitPromise = null;
        throw error;
      });
  }

  return liffInitPromise;
}

export const LiffProvider = ({ children }: { children: React.ReactNode }) => {
  const [liffId] = useState(process.env.NEXT_PUBLIC_LIFF_ID ?? "");
  const [liffObject, setLiffObject] = useState<Liff | null>(null);
  const [liffError, setLiffError] = useState<string | null>(() =>
    liffId ? null : "NEXT_PUBLIC_LIFF_ID is not set"
  );
  const [isReady, setIsReady] = useState(() => !liffId);

  useEffect(() => {
    let cancelled = false;

    if (!liffId) return;

    initLiff(liffId)
      .then((liff) => {
        if (cancelled) return;
        setLiffObject(liff);
        setIsReady(true);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.error("LIFF init failed:", error);
        setLiffError(error instanceof Error ? error.message : String(error));
        setIsReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [liffId]);

  return (
    <LiffContext.Provider value={{ liffObject, liffError, isReady }}>
      {children}
    </LiffContext.Provider>
  );
};
