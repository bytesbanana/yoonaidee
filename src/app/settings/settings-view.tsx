"use client";

import liff from "@line/liff";
import { useEffect, useState } from "react";
import { categoryLabels, hasCompleteWeights, type PreferenceCategory } from "@/lib/preferences/categories";

type Settings = {
  categories: PreferenceCategory[];
  budget: number | null;
  transport: string | null;
  preferredModes: string[];
  destination: string | null;
  housing: string[];
};

type View =
  | { status: "loading" | "sign-in" }
  | { status: "error"; message: string }
  | { status: "loaded"; settings: Settings | null };

export function SettingsView({ liffId }: { liffId: string }) {
  const [view, setView] = useState<View>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const update = (next: View) => { if (!cancelled) setView(next); };

    async function load() {
      if (!liffId) {
        update({ status: "error", message: "LINE sign-in has not been configured." });
        return;
      }
      try {
        await liff.init({ liffId });
        if (!liff.isLoggedIn()) {
          update({ status: "sign-in" });
          return;
        }
        const token = liff.getIDToken();
        if (!token) {
          update({ status: "error", message: "LINE did not provide an ID token. Open this page again from the LINE menu." });
          return;
        }
        const response = await fetch("/api/settings", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok) {
          update({ status: "error", message: result.error ?? "Could not load your settings." });
          return;
        }
        update({ status: "loaded", settings: result.settings });
      } catch {
        update({ status: "error", message: "Could not connect to LINE. Try reopening this page." });
      }
    }

    void load();
    return () => { cancelled = true; controller.abort(); };
  }, [liffId]);

  const settings = view.status === "loaded" ? view.settings : null;
  const categories = settings?.categories ?? [];
  const total = categories.reduce((sum, { weight }) => sum + (weight ?? 0), 0);
  const complete = hasCompleteWeights(categories);
  const transport = settings?.preferredModes.join(", ") || settings?.transport?.replaceAll("_", " ");
  const details = [
    ["Destination", settings?.destination],
    ["Monthly rent ceiling", settings?.budget ? `฿${settings.budget.toLocaleString("en-TH")}` : null],
    ["Transport", transport],
    ["Housing types", settings?.housing.join(", ")],
  ].filter(([, value]) => value);

  return (
    <main className="min-h-screen bg-stone-100 px-5 py-10 text-stone-900 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <p className="mb-3 text-sm font-semibold text-emerald-800">Yoo Nai Dee</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Housing preferences</h1>
        <p className="mt-3 text-sm text-stone-600">Update your preferences in the Yoo Nai Dee LINE chat.</p>

        {view.status === "loading" && <p className="mt-8" role="status">Loading your preferences…</p>}
        {view.status === "error" && <p className="mt-8 rounded-xl bg-white p-5" role="alert">{view.message}</p>}
        {view.status === "sign-in" && (
          <button
            className="mt-8 rounded-lg bg-emerald-800 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-900"
            onClick={() => liff.login({ redirectUri: `${window.location.origin}/settings` })}
          >
            Sign in with LINE
          </button>
        )}

        {view.status === "loaded" && (
          <section aria-labelledby="priorities" className="mt-8 rounded-2xl border border-stone-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 px-5 py-4">
              <h2 id="priorities" className="text-lg font-semibold">Location priorities</h2>
              {categories.length > 0 && (
                <span className={complete ? "text-sm font-semibold text-emerald-800" : "text-sm font-medium text-amber-800"}>
                  {total}% {complete ? "total" : "allocated · in progress"}
                </span>
              )}
            </div>
            {categories.length ? (
              <ul className="divide-y divide-stone-100">
                {categories.map(({ category, places, weight }) => (
                  <li key={category} className="flex items-start justify-between gap-4 px-5 py-4">
                    <div>
                      <p className="font-medium">{categoryLabels[category][0]}</p>
                      <p className="mt-1 text-sm text-stone-600">{places.length ? places.join(" · ") : "Any nearby"}</p>
                    </div>
                    <span className="shrink-0 text-sm tabular-nums">{weight === null ? "Pending" : `${weight}%`}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="px-5 py-5 text-sm text-stone-600">Send a message in LINE to set your location priorities.</p>}
          </section>
        )}
        {details.length > 0 && (
          <dl className="mt-6 grid gap-4 rounded-2xl border border-stone-200 bg-white p-5 sm:grid-cols-2">
            {details.map(([label, value]) => (
              <div key={label}>
                <dt className="text-sm text-stone-600">{label}</dt>
                <dd className="mt-1 font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </main>
  );
}
