"use client";

import { useState, type FormEvent } from "react";
import { BriefcaseBusiness, Dumbbell, MapPin, ShoppingBasket, UserRound, type LucideIcon } from "lucide-react";
import {
  categoryLabels,
  type PreferenceCategory,
} from "@/lib/preferences/categories";

type Priorities = {
  sessionId: string;
  version: number;
  categories: PreferenceCategory[];
};

const categoryIcons: Partial<Record<PreferenceCategory["category"], LucideIcon>> = {
  gym: Dumbbell,
  work: BriefcaseBusiness,
  supermarket: ShoppingBasket,
};

export function ProfileView({
  profile,
  priorities,
  details,
  message,
  signIn,
  getToken,
  reload,
}: {
  profile: { displayName: string; pictureUrl?: string } | null;
  priorities: Priorities | null;
  details: [string, string | null | undefined][];
  message?: string;
  signIn?: () => void;
  getToken: () => string | null | undefined;
  reload: () => void;
}) {
  return (
    <main className="min-h-dvh bg-stone-100 px-4 py-7 text-stone-900 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-xl">
        <header className="mb-6 flex items-center justify-between gap-4 px-1">
          <h1 className="text-3xl font-semibold tracking-tight">Your profile</h1>
          {profile?.pictureUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.pictureUrl} alt="" width={48} height={48} className="size-12 shrink-0 rounded-full object-cover" />
          ) : (
            <div className="grid size-12 shrink-0 place-items-center rounded-full bg-white text-stone-600">
              <UserRound aria-hidden className="size-5" />
            </div>
          )}
        </header>

        <PriorityEditor
          key={priorities ? `${priorities.sessionId}:${priorities.version}` : "empty"}
          priorities={priorities}
          message={message}
          signIn={signIn}
          getToken={getToken}
          reload={reload}
        />

        <section aria-labelledby="housing-details" className="mt-5 rounded-3xl border border-stone-200 bg-white px-5 py-5 sm:px-6">
          <h2 id="housing-details" className="text-base font-semibold">Profile details</h2>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4">
            {[["LINE display name", profile?.displayName], ...details].map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-xs text-stone-600">{label}</dt>
                <dd className="mt-1 break-words text-sm font-medium">{value || "—"}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </main>
  );
}

function PriorityEditor({
  priorities,
  message,
  signIn,
  getToken,
  reload,
}: {
  priorities: Priorities | null;
  message?: string;
  signIn?: () => void;
  getToken: () => string | null | undefined;
  reload: () => void;
}) {
  const [saved, setSaved] = useState(priorities);
  const [draft, setDraft] = useState<Partial<Record<PreferenceCategory["category"], string>>>({});
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error" | "conflict">("idle");
  const [error, setError] = useState("");
  const categories = saved?.categories ?? [];
  const rows = categories.map((item) => ({
    ...item,
    value: draft[item.category] ?? (item.weight?.toString() ?? ""),
  }));
  const total = rows.reduce((sum, { value }) => sum + Number(value), 0);
  const valid = rows.length > 0 && rows.every(({ value }) => Number(value) >= 1) && total === 100;
  const changed = rows.some(({ weight, value }) => (weight?.toString() ?? "") !== value);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!saved || !valid || !changed || status === "saving" || status === "conflict") return;
    const token = getToken();
    if (!token) {
      setError("Open this page from LINE to save your priorities.");
      setStatus("error");
      return;
    }

    setStatus("saving");
    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: saved.sessionId,
          version: saved.version,
          weights: rows.map(({ category, value }) => ({ category, weight: Number(value) })),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "Could not save your priorities.");
        setStatus(response.status === 409 ? "conflict" : "error");
        return;
      }
      setSaved({ ...saved, categories: result.categories, version: result.version });
      setDraft({});
      setStatus("saved");
    } catch {
      setError("Could not save your priorities. Try again shortly.");
      setStatus("error");
    }
  }

  return (
    <form onSubmit={save} aria-labelledby="lifestyle-priorities" className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
      <div className="bg-emerald-950 p-5 text-white sm:p-6">
        <h2 id="lifestyle-priorities" className="text-2xl font-semibold tracking-tight">Lifestyle priorities</h2>
        <p className="mt-1 text-sm text-emerald-50/85">Split 100% across the places that matter to you.</p>
        <div className="mt-5 flex items-baseline justify-between gap-2 text-sm">
          <span className="font-medium">Total allocated</span>
          <output className="tabular-nums"><strong className="text-xl">{total}%</strong><span className="text-emerald-50/75"> / 100%</span></output>
        </div>
        <progress
          aria-label="Percentage allocated"
          max={100}
          value={Math.min(total, 100)}
          className="mt-2 block h-2 w-full overflow-hidden rounded-full bg-white/20 [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-emerald-300 [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-transparent [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-emerald-300"
        />
      </div>
      {rows.length ? (
        <>
          <fieldset disabled={status === "saving"} className="min-w-0">
            <legend className="sr-only">Category percentages</legend>
            <ul className="divide-y divide-stone-100 px-5 sm:px-6">
              {rows.map(({ category, places, value }) => {
                const label = categoryLabels[category][0];
                const Icon = categoryIcons[category] ?? MapPin;
                return (
                  <li key={category} className="grid grid-cols-[minmax(0,1fr)_5.25rem] items-center gap-3 py-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-800">
                        <Icon aria-hidden className="size-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="break-words font-semibold leading-tight">{label}</p>
                        <p className="mt-1 break-words text-xs text-stone-600">{places.length ? places.join(" · ") : "Any nearby"}</p>
                        <div aria-hidden className="mt-2 h-1.5 max-w-48 overflow-hidden rounded-full bg-stone-100">
                          <div className="h-full rounded-full bg-emerald-600" style={{ width: `${Number(value)}%` }} />
                        </div>
                      </div>
                    </div>
                    <label className="flex h-11 items-center gap-1 rounded-xl border border-stone-300 bg-stone-50 pr-3 focus-within:border-emerald-700 focus-within:ring-2 focus-within:ring-emerald-700/20">
                      <span className="sr-only">{label} percentage</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={value}
                        placeholder="—"
                        onChange={(event) => {
                          const next = event.target.value;
                          if (!/^\d{0,3}$/.test(next) || Number(next) > 100) return;
                          setDraft((previous) => ({ ...previous, [category]: next }));
                          if (status !== "conflict") setStatus("idle");
                        }}
                        className="w-full min-w-0 bg-transparent pl-2 text-right text-base font-semibold tabular-nums outline-none"
                      />
                      <span aria-hidden className="text-sm text-stone-600">%</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>
          <div className="border-t border-stone-200 bg-stone-50 px-5 py-4 sm:px-6">
            {status === "error" || status === "conflict" ? (
              <p role="alert" className="mb-3 text-sm text-red-800">{error}</p>
            ) : (
              <p role="status" className="mb-3 text-sm text-stone-600">
                {status === "saved" ? "Priorities saved." :
                  total > 100 ? `Remove ${total - 100}% to reach 100%.` :
                  total < 100 ? `${100 - total}% left to allocate.` :
                  valid ? "100% allocated." : "Give each category at least 1%."}
              </p>
            )}
            {status === "conflict" ? (
              <button type="button" onClick={reload} className="w-full rounded-xl bg-emerald-900 px-4 py-3 text-sm font-semibold text-white">Reload saved priorities</button>
            ) : (
              <button type="submit" disabled={!valid || !changed || status === "saving"} className="w-full rounded-xl bg-emerald-900 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:bg-stone-200 disabled:text-stone-600">
                {status === "saving" ? "Saving…" : "Save priorities"}
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="px-5 py-5 sm:px-6">
          <p className="text-sm text-stone-600" role="status">{message ?? "Tell us which places matter to you in the Yoo Nai Dee LINE chat. Your categories will appear here."}</p>
          {signIn && <button type="button" onClick={signIn} className="mt-4 rounded-xl bg-emerald-900 px-4 py-3 text-sm font-semibold text-white">Sign in with LINE</button>}
        </div>
      )}
    </form>
  );
}
