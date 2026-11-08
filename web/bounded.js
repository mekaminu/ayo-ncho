// A long evening (idea 8 Nov): the small records the page keeps of what it did (for the checks in tools/ and for its own
// decisions) are kept to their last few entries, so a tab left open all evening, or a call of an hour, holds no more of
// them than one of five minutes. keep(list, entry, n) adds the entry and lets the oldest go past n.
export const KEEP = 60;
export function keep(list, entry, n = KEEP) { list.push(entry); if (list.length > n) list.splice(0, list.length - n); return list; }
