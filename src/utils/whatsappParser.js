// Turns a pasted WhatsApp rate message (Bangla or English, any layout) into rate updates.
// Pure functions: no React, no network. Everything is shown to the admin for review
// before anything is applied, so the parser only has to be a good first guess.

import { DIVISION_WORDS, ALL_WORDS, DISTRICT_TO_DIVISION } from '../data/regions.js';

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

// Remove dates, phone numbers and list numbering without shifting positions.
const blank = (m) => ' '.repeat(m.length);
export const cleanForNumbers = (lineNorm) =>
  lineNorm
    .replace(/\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4}/g, blank)
    .replace(/(\+?88)?01\d{9}/g, blank)
    .replace(/^\s*\d{1,3}\s*[.)\-:]\s+/, blank);

/** Plausible rate numbers on a line, with positions: [{ v, i, end }] */
export function rateNumbers(lineNorm) {
  const t = cleanForNumbers(lineNorm);
  return [...t.matchAll(/\d+(?:\.\d+)?/g)]
    .map((m) => ({ v: parseFloat(m[0]), i: m.index, end: m.index + m[0].length, len: m[0].length }))
    .filter((n) => n.len <= 5 && n.v >= MIN_RATE && n.v <= MAX_RATE);
}

/** Pick the rate number on a line: first plausible number after `afterIndex`, else the first anywhere. */
export function extractRate(lineNorm, afterIndex = 0) {
  const nums = rateNumbers(lineNorm);
  if (!nums.length) return null;
  return (nums.find((n) => n.i >= afterIndex) || nums[0]).v;
}

// ---- regions -------------------------------------------------------------

const REGION_ALIASES = (() => {
  const list = []; // { key, division, via }  via = district text or null ('all' division = whole country)
  Object.entries(DIVISION_WORDS).forEach(([div, words]) =>
    words.forEach((w) => list.push({ key: normalize(w), division: div, via: null })));
  ALL_WORDS.forEach((w) => list.push({ key: normalize(w), division: 'all', via: null }));
  Object.entries(DISTRICT_TO_DIVISION).forEach(([w, div]) => list.push({ key: normalize(w), division: div, via: w }));
  return list.sort((x, y) => y.key.length - x.key.length); // longest first
})();

/** Regions mentioned in a line, in order: [{ division, via, index, end }] (non-overlapping). */
export function findRegions(lineNorm) {
  const found = [];
  const taken = [];
  for (const r of REGION_ALIASES) {
    let from = 0;
    for (;;) {
      let idx = lineNorm.indexOf(r.key, from);
      if (idx < 0) break;
      from = idx + 1;
      const end = idx + r.key.length;
      if (isLatin(r.key)) {
        const before = lineNorm[idx - 1];
        const after = lineNorm[end];
        if ((before && /[a-z]/.test(before)) || (after && /[a-z]/.test(after))) continue;
      }
      if (taken.some(([s, e]) => idx < e && end > s)) continue;
      taken.push([idx, end]);
      found.push({ division: r.division, via: r.via, index: idx, end });
    }
  }
  return found.sort((x, y) => x.index - y.index);
}

/**
 * Parse pasted text against the current rate list.
 * Returns { rows, skipped } where each row is
 *   { line, itemId|null, candidates: [ids], rate, category, division, via }
 * division: a division id, 'all' (whole country said), or null (the message gave no region).
 */
export function parseWhatsAppRates(text, items) {
  const aliasMap = items.map((it) => ({ item: it, aliases: buildAliases(it) }));
  const rows = [];
  const skipped = [];
  let contextCategory = null;
  let contextRegion = null; // { division, via } from a heading like "ঢাকা বিভাগ"
  let contextCompany = null; // { hits } from a heading like "কাজী:" followed by "ঢাকা ৪০" lines

  const lines = String(text || '')
    .split(/\r?\n|;/)
    .map((l) => l.replace(/[*_~`]/g, '').trim()) // WhatsApp bold/italic markers
    .filter(Boolean);

  const findCompany = (lineNorm, lineCompact) => {
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
    return hits.filter((h) => h.score === best);
  };

  const pickCandidates = (hits, wanted) => {
    if (!wanted) return hits;
    const filtered = hits.filter((h) => h.item.category === wanted);
    return filtered.length ? filtered : hits;
  };

  const pushRow = (line, candidates, rate, wanted, region) => {
    // No category given and several breeds match ("কাজী ৪০"): DOC messages are almost always broiler.
    let assumed = false;
    let itemId = candidates.length === 1 ? candidates[0].item.id : null;
    if (!itemId && !wanted) {
      const broilers = candidates.filter((c) => c.item.category === 'broiler');
      if (broilers.length === 1) { itemId = broilers[0].item.id; assumed = true; }
    }
    rows.push({
      line,
      assumed,
      itemId,
      candidates: candidates.map((c) => c.item.id),
      rate,
      category: wanted,
      division: region ? region.division : null,
      via: region ? region.via : null
    });
  };

  for (const line of lines) {
    const lineNorm = normalize(line);
    const lineCompact = lineNorm.replace(/\s+/g, '');
    const lineCategory = detectCategory(line);
    const regionsHere = findRegions(lineNorm);
    const nums = rateNumbers(lineNorm);
    const hits = findCompany(lineNorm, lineCompact);
    const wanted = lineCategory || contextCategory;

    // 1) Heading: company name only ("কাজী:") -> following lines are that company's regions.
    if (hits.length && !nums.length) {
      contextCompany = { hits };
      if (regionsHere.length) contextRegion = regionsHere[0];
      if (lineCategory) contextCategory = lineCategory;
      continue;
    }

    // 2) Heading: region/category only ("ঢাকা বিভাগ", "ব্রয়লার বাচ্চার রেট")
    if (!hits.length && !nums.length) {
      if (regionsHere.length) { contextRegion = regionsHere[0]; contextCompany = null; if (lineCategory) contextCategory = lineCategory; continue; }
      if (lineCategory) { contextCategory = lineCategory; continue; }
      skipped.push(line);
      continue;
    }

    // 3) "ঢাকা ৪০" style line under a company heading
    if (!hits.length && contextCompany && regionsHere.length && nums.length) {
      const cands = pickCandidates(contextCompany.hits, wanted);
      regionsHere.forEach((rg, k) => {
        const next = regionsHere[k + 1];
        const num = nums.find((n) => n.i >= rg.end && (!next || n.i < next.index));
        if (num) pushRow(line, cands, num.v, wanted, rg);
      });
      continue;
    }

    if (!hits.length) { skipped.push(line); continue; }

    // 4) A company line. Regions may be inline ("কাজী ঢাকা ৪০ চট্টগ্রাম ৪১") or inherited from a heading.
    contextCompany = null;
    const cands = pickCandidates(hits, wanted);
    if (regionsHere.length >= 1) {
      let pushed = 0;
      regionsHere.forEach((rg, k) => {
        const next = regionsHere[k + 1];
        let num = nums.find((n) => n.i >= rg.end && (!next || n.i < next.index));
        if (!num) num = nums.filter((n) => n.end <= rg.index).pop(); // "৪১ ঢাকা"
        if (num) { pushRow(line, cands, num.v, wanted, rg); pushed += 1; }
      });
      if (pushed) continue;
    }
    const rate = extractRate(lineNorm, cands[0].pos ? cands[0].pos.end : 0);
    if (rate == null) { skipped.push(line); continue; }
    pushRow(line, cands, rate, wanted, contextRegion);
  }
  return { rows, skipped };
}
