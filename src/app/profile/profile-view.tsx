"use client";

import { useState, type FormEvent } from "react";
import { GooglePlacePicker } from "./google-place-picker";
import { BriefcaseBusiness, Dumbbell, MapPin, Plus, ShoppingBasket, UserRound, X, type LucideIcon } from "lucide-react";
import {
  categoryFromName,
  categoryId,
  categoryKey,
  maxCustomCategoryNameLength,
  maxPreferenceCategories,
  profileCategoryPresets,
  isGoogleMapsLink,
  preferencePlaces,
  type PreferenceCategory,
} from "@/lib/preferences/categories";
import { capitalizeWords } from "@/lib/format-text";
import { formatPriorityCategory, formatPriorityLocation } from "@/lib/preferences/display";
import { normalizeCategoryLocations } from "@/lib/preferences/locations";

type Category = PreferenceCategory["category"];

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
  getAuthHeaders,
  reload,
}: {
  profile: { displayName: string; pictureUrl?: string } | null;
  priorities: Priorities | null;
  details: [string, string | null | undefined][];
  message?: string;
  signIn?: () => void;
  getAuthHeaders: () => Record<string, string> | null;
  reload: () => void;
}) {
  return (
    <main className="min-h-dvh bg-stone-100 px-4 py-7 text-stone-900 [font-family:var(--font-geist-sans),sans-serif] sm:px-6 sm:py-12">
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
          getAuthHeaders={getAuthHeaders}
          reload={reload}
        />

        <section aria-labelledby="housing-details" className="mt-5 rounded-3xl border border-stone-200 bg-white px-5 py-5 sm:px-6">
          <h2 id="housing-details" className="text-base font-semibold">Profile Details</h2>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4">
            {[["LINE Display Name", profile?.displayName && capitalizeWords(profile.displayName)], ...details].map(([label, value]) => (
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

function toRows(categories: PreferenceCategory[]) {
  return categories.map(({ category, places, weight }) => ({ category, locationText: normalizeCategoryLocations(places).join("\n"), value: weight?.toString() ?? "" }));
}

function locationsFromText(value: string) {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function PriorityEditor({
  priorities,
  message,
  signIn,
  getAuthHeaders,
  reload,
}: {
  priorities: Priorities | null;
  message?: string;
  signIn?: () => void;
  getAuthHeaders: () => Record<string, string> | null;
  reload: () => void;
}) {
  const [saved, setSaved] = useState(priorities);
  const [rows, setRows] = useState(() => toRows(priorities?.categories ?? []));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selected, setSelected] = useState("");
  const [customName, setCustomName] = useState("");
  const [limitMessage, setLimitMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error" | "conflict">("idle");
  const [error, setError] = useState("");
  const total = rows.reduce((sum, { value }) => sum + Number(value), 0);
  const locationsValid = rows.every(({ locationText }) => preferencePlaces.safeParse(locationsFromText(locationText)).success);
  const valid = rows.every(({ value }) => !value || Number(value) >= 1) && total <= 100 && locationsValid;
  const previous = toRows(saved?.categories ?? []);
  const changed = rows.length !== previous.length || rows.some(({ category, value, locationText }, index) =>
    previous[index]?.category !== category || Number(previous[index]?.value) !== Number(value)
    || previous[index]?.locationText !== locationsFromText(locationText).join("\n"),
  );
  const usedCategories = new Set(rows.map(({ category }) => categoryKey(category)));
  const available = profileCategoryPresets.filter((category) => !usedCategories.has(categoryKey(category)));
  const candidate = selected === "custom" ? categoryFromName(customName) : selected;
  const duplicate = usedCategories.has(categoryKey(candidate));
  const canAdd = categoryId.safeParse(candidate).success && !duplicate && rows.length < maxPreferenceCategories;
  const busy = status === "saving" || status === "conflict";

  function updateValue(category: Category, value: string, next: string) {
    if (!/^\d{0,3}$/.test(next)) return;
    const nextTotal = total - Number(value) + Number(next);
    if (Number(next) > 100 || (nextTotal > 100 && nextTotal >= total)) {
      setLimitMessage("The total can’t exceed 100%. Lower another category to free up room.");
      return;
    }
    setRows((current) => current.map((row) => row.category === category ? { ...row, value: next } : row));
    setLimitMessage("");
    setStatus("idle");
  }

  function updateLocations(category: Category, locationText: string) {
    setRows((current) => current.map((row) => row.category === category ? { ...row, locationText } : row));
    setStatus("idle");
  }

  function addCategory() {
    if (!canAdd) return;
    const original = previous.find(({ category }) => categoryKey(category) === categoryKey(candidate));
    setRows((current) => [...current, { category: candidate, locationText: original?.locationText ?? "", value: "" }]);
    setSelected("");
    setCustomName("");
    setPickerOpen(false);
    setLimitMessage("");
    setStatus("idle");
  }

  function removeCategory(category: Category) {
    setRows((current) => current.filter((row) => row.category !== category));
    setLimitMessage("");
    setStatus("idle");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid || !changed || busy || message) return;
    const headers = getAuthHeaders();
    if (!headers) {
      setError("Sign in with LINE again to save your priorities.");
      setStatus("error");
      return;
    }

    setStatus("saving");
    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: saved?.sessionId ?? null,
          version: saved?.version ?? null,
          weights: rows.map(({ category, value, locationText }) => ({
            category,
            weight: value ? Number(value) : null,
            places: locationsFromText(locationText),
          })),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "Could not save your priorities.");
        setStatus(response.status === 409 ? "conflict" : "error");
        return;
      }
      setSaved(result);
      setRows(toRows(result.categories));
      setLimitMessage("");
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
        <p className="mt-1 text-sm text-emerald-50/85">Allocate up to 100% across the places that matter to you.</p>
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
      {!message && (
        <fieldset disabled={busy} className="min-w-0">
          <legend className="sr-only">Lifestyle categories</legend>
          <div className="border-b border-stone-100 px-5 py-4 sm:px-6">
            {pickerOpen ? (
              <div className="flex flex-wrap items-end gap-2">
                <label className="min-w-40 flex-1 text-sm font-medium">
                  Category
                  <select
                    value={selected}
                    onChange={(event) => setSelected(event.target.value)}
                    className="mt-1 block h-11 w-full rounded-xl border border-stone-300 bg-white px-2 text-base"
                  >
                    <option value="">Choose a category</option>
                    {available.map((category) => <option key={category} value={category}>{formatPriorityCategory(category)}</option>)}
                    <option value="custom">Custom category</option>
                  </select>
                </label>
                <button type="button" disabled={!canAdd} onClick={addCategory} className="h-11 rounded-xl bg-emerald-900 px-4 text-sm font-semibold text-white disabled:bg-stone-200 disabled:text-stone-600">Add</button>
                <button type="button" onClick={() => { setPickerOpen(false); setSelected(""); setCustomName(""); }} className="h-11 px-2 text-sm font-medium text-stone-700">Cancel</button>
                {selected === "custom" && (
                  <label className="w-full text-sm font-medium">
                    Category name
                    <input
                      type="text"
                      value={customName}
                      maxLength={maxCustomCategoryNameLength}
                      onChange={(event) => setCustomName(event.target.value)}
                      placeholder="e.g. Music studio"
                      className="mt-1 block h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-base"
                    />
                  </label>
                )}
                {duplicate && <p role="status" className="w-full text-sm text-stone-600">This category is already on your list.</p>}
              </div>
            ) : rows.length < maxPreferenceCategories && (
              <button type="button" onClick={() => setPickerOpen(true)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-900 hover:bg-emerald-100">
                <Plus aria-hidden className="size-4" /> Add category
              </button>
            )}
          </div>
          {rows.length === 0 && <p className="px-5 py-5 text-sm text-stone-600 sm:px-6">No categories selected.</p>}
            <ul className="divide-y divide-stone-100 px-5 sm:px-6">
              {rows.map(({ category, locationText, value }) => {
                const label = formatPriorityCategory(category);
                const Icon = categoryIcons[category] ?? MapPin;
                const places = locationsFromText(locationText);
                const locationLabel = places.map(formatPriorityLocation).join(" · ");
                return (
                  <li key={category} className="grid grid-cols-[minmax(0,1fr)_4.75rem_2.75rem] items-center gap-2 sm:gap-3 py-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-800">
                        <Icon aria-hidden className="size-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="break-words font-semibold leading-tight">{label}</p>
                        <p className="mt-1 break-words text-xs text-stone-600">{locationLabel || "Any Nearby"}</p>
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
                        onChange={(event) => updateValue(category, value, event.target.value)}
                        className="w-full min-w-0 bg-transparent pl-2 text-right text-base font-semibold tabular-nums outline-none"
                      />
                      <span aria-hidden className="text-sm text-stone-600">%</span>
                    </label>
                    <button
                      type="button"
                      aria-label={`Remove ${label}`}
                      onClick={() => removeCategory(category)}
                      className="grid size-11 place-items-center rounded-xl text-stone-600 hover:bg-red-50 hover:text-red-800"
                    >
                      <X aria-hidden className="size-4" />
                    </button>
                    <details className="col-span-full rounded-xl bg-stone-50 px-3 py-2">
                      <summary className="cursor-pointer py-1 text-sm font-medium text-emerald-900">Edit locations</summary>
                      {places.length < 5 && (
                        <GooglePlacePicker
                          categoryLabel={label}
                          onSelect={(url) => {
                            if (busy) return false;
                            const updated = [...places, url];
                            if (places.includes(url) || !preferencePlaces.safeParse(updated).success) return false;
                            updateLocations(category, updated.join("\n"));
                            return true;
                          }}
                        />
                      )}
                      <label className="mt-2 block text-sm text-stone-700">
                        {label} locations
                        <textarea
                          rows={2}
                          value={locationText}
                          maxLength={10244}
                          placeholder="Place name, address, or Google Maps link"
                          onChange={(event) => updateLocations(category, event.target.value)}
                          className="mt-1 block w-full rounded-lg border border-stone-300 bg-white p-2 text-base"
                        />
                      </label>
                      <p className="mt-1 text-xs text-stone-600">Up to 5 places, one per line. Leave blank for any nearby location.</p>
                      {places.filter(isGoogleMapsLink).map((place, index) => (
                        <a key={index} href={place} target="_blank" rel="noopener noreferrer" className="mt-2 block text-sm text-emerald-800 underline">
                          Open map location {index + 1}
                        </a>
                      ))}
                    </details>
                  </li>
                );
              })}
            </ul>
        </fieldset>
      )}
      {!message && (rows.length > 0 || changed || status !== "idle") && (
          <div className="border-t border-stone-200 bg-stone-50 px-5 py-4 sm:px-6">
            {status === "error" || status === "conflict" ? (
              <p role="alert" className="mb-3 text-sm text-red-800">{error}</p>
            ) : (
              <p role="status" className="mb-3 text-sm text-stone-600">
                {status === "saved" ? "Priorities saved." :
                  limitMessage ||
                  (total > 100 ? `Remove ${total - 100}% to reach 100%.` :
                    !locationsValid ? "Enter up to five locations per category using place names, addresses, or Google Maps links." :
                      !valid ? "Enter a percentage from 1 to 100, or leave it blank." :
                      total < 100 ? `${100 - total}% left to allocate.` : "100% allocated.")}
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
      )}
      {message && (
        <div className="px-5 py-5 sm:px-6">
          <p className="text-sm text-stone-600" role="status">{message}</p>
          {signIn && <button type="button" onClick={signIn} className="mt-4 rounded-xl bg-emerald-900 px-4 py-3 text-sm font-semibold text-white">Sign in with LINE</button>}
        </div>
      )}
    </form>
  );
}
