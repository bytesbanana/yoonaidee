import { savedSearchesSchema, type SavedSearch } from "./stay-search";

const storageKey = "yoonaidee.stay-searches.v1";

export function readSearches() {
  try {
    return localStorage.getItem(storageKey) ?? "";
  } catch {
    return "";
  }
}

export function parseSearches(value: string): SavedSearch[] {
  try {
    return savedSearchesSchema.parse(JSON.parse(value || "[]"));
  } catch {
    return [];
  }
}

export function subscribeSearches(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(storageKey, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(storageKey, onChange);
  };
}

export function writeSearches(searches: SavedSearch[]): boolean {
  try {
    localStorage.setItem(storageKey, JSON.stringify(searches));
    window.dispatchEvent(new Event(storageKey));
    return true;
  } catch {
    return false;
  }
}
