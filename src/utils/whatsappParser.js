// Turns a pasted WhatsApp rate message (Bangla or English, any layout) into rate updates.
// Pure functions: no React, no network. Everything is shown to the admin for review
// before anything is applied, so the parser only has to be a good first guess.

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
export const toEnDigits = (s) => String(s ?? '').replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));

/** Lower-case, Bangla digits -> English, and fold common Bangla spelling variants. */
export const normalize = (s) =>
  toEnDigits(s)
    .normalize('NFC')
    .toLowerCase()
    .replace(/[‌‍]/g, '')
    .replace(/[ীি]/g, 'ি')
    .replace(/[ূু]/g, 'ু')
    .replace(/ণ/g, 'ন')
    .replace(/[শষ]/g, 'স')
    .replace(/[ড়]/g, 'র')
    .replace(/[ঢ়]/g, 'ঢ');

const GENERIC = new Set(
  [
    'ফার্মস', 'ফার্ম', 'গ্রুপ', 'পোল্ট্রি', 'এগ্রো', 'ব্রিডার্স', 'লিমিটেড', 'লিঃ',
    'farms', 'farm', 'ltd', 'limited', 'group', 'poultry', 'agro', 'breeders', 'feed', 'feeds', 'hatchery', 'the', 'bangladesh'
  ].map(normalize)
);

const CATEGORY_WORDS = {
  broiler: ['ব্রয়লার', 'ব্রইলার', 'broiler'],
  sonali: ['সোনালী', 'সোনালি', 'sonali'],
  cockerel: ['কক্রেল', 'ককরেল', 'কক', 'cockerel', 'cock']
};
const CATEGORY_NORM = Object.fromEntries(
  Object.entries(CATEGORY_WORDS).map(([k, words]) => [k, words.map(normalize)])
);

const isLatin = (t) => /^[a-z0-9.\s]+$/.test(t);

/** Category mentioned in a piece of text, or null. */
export function detectCategory(text) {
  const n = normalize(text);
  for (const [cat, words] of Object.entries(CATEGORY_NORM)) {
    for (const w of words) {
      if (isLatin(w)) {
        if (new RegExp(`(?<![a-z])${w}(?![a-z])`).test(n)) return cat;
      } else if (n.includes(w)) {
        return cat;
      }
    }
  }
  return null;
}

/** Search keys for one rate item: [{ key, compact }] where compact = whitespace-free match. */
export function buildAliases(item) {
  const aliases = new Map(); // key -> kind
  const add = (raw, kind) => {
    const key = normalize(raw).replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
    if (key.length >= 2) aliases.set(key, kind);
  };
  const company = String(item.company || '');
  const bnPart = company.split('(')[0];
  const parenPart = (company.match(/\(([^)]*)\)/) || [])[1] || '';
  const enPart = String(item.companyEn || '');

  const strip = (text) =>
    normalize(text)
      .replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((w) => w && !GENERIC.has(w));

  [bnPart, parenPart, enPart].forEach((src) => {
    const words = strip(src);
    if (!words.length) return;
    if (words.length > 1) add(words.join(' '), 'full');
    words.forEach((w) => {
      if (w.length >= 3 || (isLatin(w) && w.length >= 2)) add(w, 'token');
    });
    if (words.length === 1) add(words[0], 'full');
  });
  return [...aliases.keys()];
}

const hasAlias = (lineNorm, lineCompact, alias) => {
  if (isLatin(alias)) {
    const esc = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s*');
    const m = new RegExp(`(?<![a-z])${esc}(?![a-z])`).exec(lineNorm);
    return m ? { index: m.index, end: m.index + m[0].length } : null;
  }
  const i = lineNorm.indexOf(alias);
  if (i >= 0) return { index: i, end: i + alias.length };
  const compactAlias = alias.replace(/\s+/g, '');
  if (compactAlias !== alias && lineCompact.includes(compactAlias)) {
    const j = lineNorm.indexOf(alias.split(' ')[0]);
    return { index: Math.max(j, 0), end: Math.max(j, 0) + compactAlias.length };
  }
  return null;
};

const MIN_RATE = 3;
const MAX_RATE = 300;

/** Pick the rate number on a line: first plausible number after `afterIndex`, else the first anywhere. */
export function extractRate(lineNorm, afterIndex = 0) {
  let t = lineNorm
    .replace(/\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4}/g, ' ') // dates
    .replace(/(\+?88)?01\d{9}/g, ' ') // phone numbers
    .replace(/^\s*\d{1,3}\s*[.)\-:]\s+/, ' '); // list numbering "1." / "2)"
  // Positions shift after replacements, so search by order instead of index when needed.
  const nums = [...t.matchAll(/\d+(?:\.\d+)?/g)]
    .map((m) => ({ v: parseFloat(m[0]), i: m.index, len: m[0].length }))
    .filter((n) => n.len <= 5 && n.v >= MIN_RATE && n.v <= MAX_RATE);
  if (!nums.length) return null;
  // Shifting is only an issue if text before the alias was altered; fall back gracefully.
  const after = nums.find((n) => n.i >= Math.min(afterIndex, t.length));
  return (after || nums[0]).v;
}

/**
 * Parse pasted text against the current rate list.
 * Returns { rows, skipped } where each row is
 *   { line, itemId|null, candidates: [ids], rate, category }
 */
export function parseWhatsAppRates(text, items) {
  const aliasMap = items.map((it) => ({ item: it, aliases: buildAliases(it) }));
  const rows = [];
  const skipped = [];
  let contextCategory = null;

  const lines = String(text || '')
    .split(/\r?\n|;/)
    .map((l) => l.replace(/[*_~`]/g, '').trim()) // WhatsApp bold/italic markers
    .filter(Boolean);

  for (const line of lines) {
    const lineNorm = normalize(line);
    const lineCompact = lineNorm.replace(/\s+/g, '');
    const lineCategory = detectCategory(line);

    // Find the best-matching company(ies) on the line.
    let best = 0;
    let hits = [];
    for (const { item, aliases } of aliasMap) {
      let score = 0;
      let pos = null;
      for (const a of aliases) {
        const m = hasAlias(lineNorm, lineCompact, a);
        if (m && a.replace(/\s+/g, '').length > score) {
          score = a.replace(/\s+/g, '').length;
          pos = m;
        }
      }
      if (score > 0) hits.push({ item, score, pos });
      best = Math.max(best, score);
    }
    hits = hits.filter((h) => h.score === best);

    if (!hits.length) {
      // A heading like "ব্রয়লার বাচ্চার রেট" sets the category for the lines below it.
      if (lineCategory) contextCategory = lineCategory;
      else skipped.push(line);
      continue;
    }

    const wanted = lineCategory || contextCategory;
    let candidates = hits;
    if (wanted) {
      const filtered = hits.filter((h) => h.item.category === wanted);
      if (filtered.length) candidates = filtered;
    }
    const rate = extractRate(lineNorm, candidates[0].pos ? candidates[0].pos.end : 0);
    if (rate == null) {
      skipped.push(line);
      continue;
    }
    rows.push({
      line,
      itemId: candidates.length === 1 ? candidates[0].item.id : null,
      candidates: candidates.map((c) => c.item.id),
      rate,
      category: wanted
    });
  }
  return { rows, skipped };
}
