import { capitalizeWords } from "@/lib/format-text";

const commonSpellings = new Map([
  ["bangkok", "Bangkok"],
  ["bangok", "Bangkok"],
  ["bangkock", "Bangkok"],
  ["bankgok", "Bangkok"],
  ["sukhumvit", "Sukhumvit"],
  ["sukumvit", "Sukhumvit"],
  ["sukhumvitt", "Sukhumvit"],
  ["sukhumivt", "Sukhumvit"],
  ["bts", "BTS"],
  ["mrt", "MRT"],
  ["srt", "SRT"],
  ["arl", "ARL"],
  ["brt", "BRT"],
  ["bkk", "BKK"],
  ["mbk", "MBK"],
  ["iconsiam", "ICONSIAM"],
  ["raod", "Road"],
  ["streat", "Street"],
  ["staion", "Station"],
]);

export function normalizeLocation(value: string, maxLength = Infinity) {
  const trimmed = value.trim();
  if (/^(?:[a-z][a-z0-9+.-]*:\/\/|www\.)/i.test(trimmed)) return trimmed;

  const formatted = capitalizeWords(trimmed, commonSpellings);
  return formatted.length <= maxLength ? formatted : trimmed;
}

export function normalizeCategoryLocations(places: string[]) {
  return [...new Set(places.map((place) => normalizeLocation(place, 120)))];
}
