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
  ["arl", "ARL"],
  ["brt", "BRT"],
  ["bkk", "BKK"],
  ["mbk", "MBK"],
  ["iconsiam", "ICONSIAM"],
  ["raod", "Road"],
  ["streat", "Street"],
  ["staion", "Station"],
]);

function formatWord(word: string) {
  const lower = word.toLowerCase();
  const known = commonSpellings.get(lower);
  if (known) return known;
  if (word !== lower && word !== word.toUpperCase()) return word;
  return lower.replace(/^\p{Script=Latin}/u, (letter) => letter.toUpperCase());
}

export function normalizeLocation(value: string, maxLength: number) {
  const trimmed = value.trim();
  if (/^(?:[a-z][a-z0-9+.-]*:\/\/|www\.)/i.test(trimmed)) return trimmed;

  const formatted = trimmed.replace(/\s+/g, " ")
    .replace(/[\p{Script=Latin}\d][\p{Script=Latin}\p{M}\d]*(?:['’][\p{Script=Latin}\p{M}]+)*/gu, formatWord);
  return formatted.length <= maxLength ? formatted : trimmed;
}

export function normalizeCategoryLocations(places: string[]) {
  return [...new Set(places.map((place) => normalizeLocation(place, 120)))];
}
