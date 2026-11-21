export type QuickReplyOption = { label: string; text: string };

export type LineQuickReply = {
  items: Array<{
    type: "action";
    action: { type: "message"; label: string; text: string };
  }>;
};

const MAX_ITEMS = 4;
const MAX_LABEL_LENGTH = 20;
const MAX_TEXT_LENGTH = 300;

// LINE counts message-action labels and text in grapheme clusters.
const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });
function truncate(value: string, max: number) {
  return Array.from(graphemes.segment(value), ({ segment }) => segment).slice(0, max).join("");
}

/**
 * Build a LINE quick reply whose buttons send a message as the user.
 * https://developers.line.biz/en/reference/messaging-api/#message-action
 */
export function buildQuickReply(options: QuickReplyOption[] | undefined): LineQuickReply | undefined {
  if (!options?.length) return undefined;
  const seen = new Set<string>();
  const items: LineQuickReply["items"] = [];
  for (const option of options) {
    const text = option.text.trim();
    const key = text.normalize("NFC").toLowerCase();
    if (!text || truncate(text, MAX_TEXT_LENGTH) !== text || seen.has(key)) continue;
    const label = truncate(option.label.trim(), MAX_LABEL_LENGTH).trimEnd();
    if (!label) continue;
    seen.add(key);
    items.push({ type: "action", action: { type: "message", label, text } });
    if (items.length >= MAX_ITEMS) break;
  }
  return items.length ? { items } : undefined;
}
