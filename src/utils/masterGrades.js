// Reads the "DOC Rate Master Grades" Excel and turns it into site rates.
//
// Layout of the sheet (one sheet per date, e.g. "24-11-2026 Tuesday"):
//   row 6  bird type   (Broiler / Layer / Colour Bird / Sonali / Cock)   - written once, at the first column of its block
//   row 7  company                                                       - once per company block
//   row 8  breed                                                         - once per breed block
//   row 9  grade       A / M / B+  (one column each; the plain "B" column is skipped)
//   rows 10..29  one row per zone (name in column B), the cells hold the rate
// A rate is therefore  type + company + breed + grade + zone.
//
// Nothing here changes the site: the admin reviews `errors` / `warnings` and the plan first.
import { ZONES, zoneIdFromName, deriveFromZones } from '../data/zones.js';
import { MASTER_GRADES, IGNORED_GRADES } from '../data/grades.js';
import { ITEM_MAP, COMPANY_KEY, COMPANY_BN } from './excelRates.js';

const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const slug = (s) => norm(s).slice(0, 40) || 'x';
const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

// Bangla names for companies this sheet has that the daily importer does not know.
const EXTRA_COMPANY_BN = {
  tamim: 'তামিম', sadesh: 'সাদেশ', afil: 'আফিল', acigodrej: 'এসিআই গোদরেজ', mars: 'মার্স', care: 'কেয়ার', soguna: 'সুগুনা',
  brac: 'ব্র্যাক', goldenharvest: 'গোল্ডেন হার্ভেস্ট', lalteer: 'লাল তীর', banglabird: 'বাংলাবার্ড'
};

export const MIN_RATE = 1;
export const MAX_RATE = 500;

const BLANKS = new Set(['', '-', '—', '–', 'na', 'n/a', 'nil']);
const BN_DIGITS = '০১২৩৪৫৬৭৮৯';

const typeKey = (v) => {
  const k = norm(v);
  if (k.startsWith('broiler')) return 'broiler';
  if (k.startsWith('layer')) return 'layer';
  if (k.startsWith('colo')) return 'colour';
  if (k.startsWith('sonali')) return 'sonali';
  if (k.startsWith('cock')) return 'cock';
  return null;
};

const gradeKey = (v) => {
  const k = String(v ?? '').toUpperCase().replace(/\s+/g, '').replace(/＋/g, '+');
  return MASTER_GRADES.includes(k) ? k : null;
};

const colLetter = (n) => {
  let s = '';
  for (let x = n; x > 0; x = Math.floor((x - 1) / 26)) s = String.fromCharCode(65 + ((x - 1) % 26)) + s;
  return s;
};

const parseSheetDate = (name, cell) => {
  const m = String(name).match(/(\d{1,2})[-./](\d{1,2})[-./](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  if (cell instanceof Date && !Number.isNaN(cell.getTime())) {
    return `${cell.getFullYear()}-${String(cell.getMonth() + 1).padStart(2, '0')}-${String(cell.getDate()).padStart(2, '0')}`;
  }
  return null;
};

/** One cell -> { blank } | { value } | { bad: 'why' } */
export function readCell(raw) {
  if (raw === null || raw === undefined) return { blank: true };
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) return { bad: 'সংখ্যা নয়' };
    return checkRange(raw);
  }
  if (raw instanceof Date) return { bad: 'তারিখ বসে গেছে, রেট নয়' };
  if (typeof raw === 'boolean') return { bad: 'সংখ্যা নয়' };
  let t = String(raw).trim().replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d))).replace(/[,৳\s]/g, '');
  if (BLANKS.has(t.toLowerCase())) return { blank: true };
  if (!/^\d+(\.\d+)?$/.test(t)) return { bad: `"${String(raw).trim().slice(0, 20)}" সংখ্যা নয়` };
  return checkRange(Number(t));
}

function checkRange(n) {
  if (n <= 0) return { bad: `${n} — রেট ০ বা ঋণাত্মক হতে পারে না` };
  if (n < MIN_RATE || n > MAX_RATE) return { bad: `${n} — অস্বাভাবিক রেট (${MIN_RATE}–${MAX_RATE} এর মধ্যে হতে হবে)` };
  return { value: Math.round(n * 100) / 100 };
}

const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/**
 * `sheets` = [{ sheet, data }] from read-excel-file. Returns the date sheets, oldest first:
 * { name, dateISO, columns, cells, errors, warnings, zonesFound, missingZones }.
 * errors block the import; warnings are only shown.
 */
export function parseMasterWorkbook(sheets) {
  const out = [];
  for (const s of sheets) {
    const data = s.data || [];
    const at = (r, c) => (data[r - 1] ? data[r - 1][c - 1] : null);
    const dateISO = parseSheetDate(s.sheet, at(3, 4));
    if (!dateISO) continue;
    const errors = [];
    const warnings = [];

    // zone rows (column B) - stop at the summary rows (Average / Highest / Lowest)
    const zoneRows = [];
    const seenZones = new Map();
    for (let r = 10; r <= Math.min(data.length, 80); r++) {
      const a = norm(at(r, 1));
      if (a.startsWith('average') || a.startsWith('highest') || a.startsWith('lowest')) break;
      const nameCell = at(r, 2);
      if (nameCell == null || !String(nameCell).trim()) continue;
      const id = zoneIdFromName(nameCell);
      if (!id) { errors.push({ cell: `B${r}`, msg: `জোনের নাম "${clean(nameCell)}" চেনা যায়নি` }); continue; }
      if (seenZones.has(id)) { errors.push({ cell: `B${r}`, msg: `জোন "${clean(nameCell)}" দুইবার আছে (আগে B${seenZones.get(id)}-এ)` }); continue; }
      seenZones.set(id, r);
      zoneRows.push({ r, id });
    }
    const missingZones = ZONES.filter((z) => !seenZones.has(z.id)).map((z) => z.en);
    if (!zoneRows.length) errors.push({ cell: 'B10', msg: 'কোনো জোনের সারি পাওয়া যায়নি (জোনের নাম B কলামে B10 থেকে থাকতে হবে)' });
    else if (missingZones.length) warnings.push({ cell: '', msg: `এই জোনগুলোর সারি ফাইলে নেই: ${missingZones.join(', ')}` });

    const width = Math.max(0, ...data.slice(5, 10).map((row) => (row ? row.length : 0)));
    const columns = new Map(); // key -> column
    const colSeen = new Map(); // key|grade -> letter
    let tKey = null, tName = '', company = '', breed = '';
    let cells = 0;

    for (let c = 4; c <= width; c++) {
      const t = at(6, c); const co = at(7, c); const b = at(8, c);
      if (t != null && String(t).trim()) { tName = clean(t); tKey = typeKey(t); }
      if (co != null && String(co).trim()) company = clean(co);
      if (b != null && String(b).trim()) breed = clean(b);
      const gRaw = at(9, c);
      if (IGNORED_GRADES.includes(String(gRaw ?? '').toUpperCase().replace(/\s+/g, ''))) continue; // plain "B" is not used on the site
      const g = gradeKey(gRaw);
      const letter = colLetter(c);

      // read the column's cells
      const vals = {};
      let any = false;
      for (const { r, id } of zoneRows) {
        const cell = readCell(at(r, c));
        if (cell.blank) continue;
        any = true;
        if (cell.bad) { errors.push({ cell: `${letter}${r}`, msg: `${company} ${breed} ${gRaw ?? ''}: ${cell.bad}` }); continue; }
        vals[id] = cell.value;
      }
      if (!any) continue; // an empty column is simply not part of this day

      if (!g) { errors.push({ cell: `${letter}9`, msg: `এই কলামে রেট আছে কিন্তু গ্রেড "${clean(gRaw)}" চেনা যায়নি (A, M বা B+ হতে হবে)` }); continue; }
      if (!tKey || !company || !breed) {
        errors.push({ cell: `${letter}6`, msg: `এই কলামে রেট আছে কিন্তু ${!tKey ? 'পাখির ধরন' : !company ? 'কোম্পানির নাম' : 'ব্রিডের নাম'} নেই` });
        continue;
      }
      const key = `${tKey}|${COMPANY_KEY(company)}|${norm(breed)}`;
      const seenKey = `${key}|${g}`;
      if (colSeen.has(seenKey)) { errors.push({ cell: `${letter}9`, msg: `${company} ${breed} গ্রেড ${g} আগে ${colSeen.get(seenKey)} কলামেও আছে (ডুপ্লিকেট)` }); continue; }
      colSeen.set(seenKey, letter);

      let col = columns.get(key);
      if (!col) {
        col = { key, cat: tKey, typeName: tName, company, companyKey: COMPANY_KEY(company), breed, grades: {}, letters: {}, count: 0 };
        columns.set(key, col);
      }
      col.grades[g] = vals;
      col.letters[g] = letter;
      const n = Object.keys(vals).length;
      col.count += n;
      cells += n;

      // soft check: a value far from the rest of its column
      const list = Object.values(vals);
      if (list.length >= 4) {
        const med = median(list);
        for (const { r, id } of zoneRows) {
          const v = vals[id];
          if (v !== undefined && Math.abs(v - med) / med > 0.35 && Math.abs(v - med) >= 3) warnings.push({ cell: `${letter}${r}`, msg: `${company} ${breed} ${g}: ${v} বাকি জোনের (মাঝামাঝি ${med}) থেকে অনেক আলাদা` });
        }
      }
    }

    // soft check: a better grade should not be cheaper than a lower one in the same zone (A >= M >= B+)
    for (const col of columns.values()) {
      for (const { r, id } of zoneRows) {
        let prev = null;
        for (const g of MASTER_GRADES) {
          const v = col.grades[g]?.[id];
          if (v === undefined) continue;
          if (prev && v > prev.v) { warnings.push({ cell: `${col.letters[g]}${r}`, msg: `${col.company} ${col.breed}: গ্রেড ${g} (${v}) গ্রেড ${prev.g} (${prev.v})-এর চেয়ে বেশি` }); }
          prev = { g, v };
        }
      }
    }

    out.push({
      name: String(s.sheet).trim(), dateISO, columns: [...columns.values()], cells, errors, warnings,
      zonesFound: zoneRows.length, missingZones
    });
  }
  return out.sort((a, b) => a.dateISO.localeCompare(b.dateISO));
}

const categoryOf = (col) => {
  if (col.cat === 'broiler') return 'broiler';
  if (col.cat === 'layer') return /white/i.test(col.breed) ? 'layer_white' : 'layer_brown';
  if (col.cat === 'cock') return 'cockerel';
  return 'sonali'; // Colour Bird and Sonali are one group on the site
};

// The grade whose rate is the headline rate of the card: A, else the best grade the sheet has.
const primaryGradeOf = (grades) => MASTER_GRADES.find((g) => grades[g] && Object.keys(grades[g]).length) || null;

/**
 * What applying `sheet` would do. Rows: { key, label, itemId, isNew, current, todayRate, primary, divisionRates,
 * zoneRates, gradeRates, count, column }. `untouched` = site items this sheet has no rate for.
 */
export function planMasterImport(sheet, items) {
  const byId = new Map(items.map((i) => [i.id, i]));
  const usedIds = new Set();
  const rows = [];
  for (const col of sheet.columns) {
    if (!col.count) continue;
    const primary = primaryGradeOf(col.grades);
    const { divisionRates, todayRate } = deriveFromZones(col.grades[primary]);
    const mapped = ITEM_MAP[col.key];
    let generated = `xl-${slug(col.companyKey)}-${slug(col.breed)}`;
    if (usedIds.has(generated)) generated = `${generated}-${col.cat}`;
    const targetId = mapped && byId.has(mapped) && !usedIds.has(mapped) ? mapped : byId.has(generated) && !usedIds.has(generated) ? generated : null;
    const itemId = targetId || generated;
    usedIds.add(itemId);
    const gradeRates = {};
    for (const g of MASTER_GRADES) if (col.grades[g] && Object.keys(col.grades[g]).length) gradeRates[g] = col.grades[g];
    rows.push({
      key: col.key,
      label: `${col.company} — ${col.breed}`,
      typeName: col.typeName,
      itemId,
      isNew: !targetId,
      current: targetId ? byId.get(targetId).todayRate : null,
      todayRate,
      primary,
      divisionRates,
      zoneRates: col.grades[primary],
      gradeRates,
      count: col.count,
      column: col
    });
  }
  const touched = new Set(rows.filter((r) => !r.isNew).map((r) => r.itemId));
  return { rows, untouched: items.filter((i) => !touched.has(i.id)) };
}

/** Apply the (checked) rows to the items; returns the new items array. */
export function applyMasterPlan(items, rows, { dateISO, previousDateISO, bookingPhone }) {
  const byId = new Map(rows.map((r) => [r.itemId, r]));
  const dayChanged = Boolean(previousDateISO) && previousDateISO !== dateISO;
  const updated = items.map((item) => {
    const row = byId.get(item.id);
    if (!row) return { ...item, rateDate: item.rateDate || (previousDateISO && previousDateISO < dateISO ? previousDateISO : '1970-01-01') };
    if (row.isNew) return item;
    return {
      ...item,
      rateDate: dateISO,
      todayRate: row.todayRate,
      yesterdayRate: dayChanged ? item.todayRate : item.yesterdayRate,
      divisionRates: row.divisionRates,
      zoneRates: row.zoneRates,
      gradeRates: row.gradeRates,
      status: 'available'
    };
  });
  const added = rows.filter((r) => r.isNew).map((row) => {
    const col = row.column;
    const bn = COMPANY_BN[col.companyKey] || EXTRA_COMPANY_BN[norm(col.company)] || col.company;
    return {
      id: row.itemId,
      company: `${bn} (${col.company})`,
      companyEn: col.company,
      category: categoryOf(col),
      breed: col.breed,
      todayRate: row.todayRate,
      yesterdayRate: row.todayRate,
      status: 'available',
      minBooking: 500,
      bookingPhone: bookingPhone || '',
      notes: '',
      divisionRates: row.divisionRates,
      zoneRates: row.zoneRates,
      gradeRates: row.gradeRates,
      rateDate: dateISO,
      verified: true
    };
  });
  const seen = new Set();
  return [...updated, ...added].filter((it) => (seen.has(it.id) ? false : (seen.add(it.id), true)));
}

/**
 * After applying: count the grade rates that really are in `items` for these rows.
 * Returns { expected, found, missing: [label...] } - found must equal expected.
 */
export function verifyMasterApplied(items, rows) {
  const byId = new Map(items.map((i) => [i.id, i]));
  let expected = 0, found = 0;
  const missing = [];
  for (const row of rows) {
    const item = byId.get(row.itemId);
    for (const g of MASTER_GRADES) {
      const want = row.gradeRates[g];
      if (!want) continue;
      for (const [zone, rate] of Object.entries(want)) {
        expected += 1;
        if (item && Number(item.gradeRates?.[g]?.[zone]) === Number(rate)) found += 1;
        else missing.push(`${row.label} ${g} ${zone}`);
      }
    }
  }
  return { expected, found, missing };
}
