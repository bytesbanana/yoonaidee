import { translate, type Language } from "@/lib/i18n";
import { capitalizeWords } from "@/lib/format-text";
import { categoryLabel, isGoogleMapsLink } from "./categories";
import { normalizeLocation } from "./locations";

const modeLabels = new Map([
  ["public transit", "Public Transit"],
  ["public transpot", "Public Transit"],
  ["flexible", "Any Mode"],
  ["motorcyle", "Motorcycle"],
  ["bycicle", "Bicycle"],
]);

const housingLabels = new Map([
  ["condo", "Condo"],
  ["condominum", "Condominium"],
  ["appartment", "Apartment"],
  ["apartmant", "Apartment"],
  ["village", "Housing Village"],
  ["town house", "Townhouse"],
]);

const categorySpellings = new Map([
  ["atm", "ATM"],
  ["restaraunt", "Restaurant"],
  ["resturant", "Restaurant"],
  ["suprmarket", "Supermarket"],
]);

function formatPreference(value: string, labels: ReadonlyMap<string, string>) {
  const words = value.replace(/[_-]/g, " ").trim().replace(/\s+/g, " ");
  return labels.get(words.toLowerCase()) ?? normalizeLocation(words);
}

export function formatTransport(mode: string, language: Language = "en") {
  return translate(language, formatPreference(mode, modeLabels));
}

export function formatHousingType(type: string, language: Language = "en") {
  return translate(language, formatPreference(type, housingLabels));
}

export function formatPriorityCategory(category: string, language: Language = "en") {
  return capitalizeWords(categoryLabel(category, language), categorySpellings);
}

export function formatPriorityLocation(place: string, language: Language = "en") {
  return isGoogleMapsLink(place) ? translate(language, "Google Maps Location") : normalizeLocation(place);
}
