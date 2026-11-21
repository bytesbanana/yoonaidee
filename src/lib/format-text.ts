export function capitalizeWords(value: string, spellings?: ReadonlyMap<string, string>) {
  return value.trim().replace(/\s+/g, " ")
    .replace(/[\p{Script=Latin}\d][\p{Script=Latin}\p{M}\d]*(?:['’][\p{Script=Latin}\p{M}]+)*/gu, (word) => {
      const lower = word.toLowerCase();
      const corrected = spellings?.get(lower);
      if (corrected) return corrected;
      if (word !== lower && word !== word.toUpperCase()) return word;
      return lower.replace(/^\p{Script=Latin}/u, (letter) => letter.toUpperCase());
    });
}
