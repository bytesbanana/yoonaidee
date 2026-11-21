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
  const words = value.replaceAll("_", " ").trim().replace(/\s+/g, " ");
  return labels.get(words.toLowerCase()) ?? normalizeLocation(words);
}

export function formatTransport(mode: string) {
  return formatPreference(mode, modeLabels);
}

export function formatHousingType(type: string) {
  return formatPreference(type, housingLabels);
}

export function formatPriorityCategory(category: string) {
  return capitalizeWords(categoryLabel(category), categorySpellings);
}

export function formatPriorityLocation(place: string) {
  return isGoogleMapsLink(place) ? "Google Maps Location" : normalizeLocation(place);
}
