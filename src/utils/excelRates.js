// Reads the "Competitors DOC Rate" Excel (one sheet per date, zones down, company/breed across)
// and turns one day's sheet into updated site rates.
import { ZONES, zoneIdFromName, deriveFromZones } from '../data/zones.js';

const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

// ---- Excel column (category|company|breed) -> existing site item ---------------------------
// Anything not listed here is added as a new item (the admin can untick it in the preview).
const ITEM_MAP = {
  'broiler|kazi|ross308': 'kazi-broiler',
  'broiler|paragon|ep': 'paragon-broiler',
  'broiler|nourish|ep': 'nourish-broiler',
  'broiler|cp|ross308': 'cp-broiler',
  'broiler|nahar|ross308': 'nahar-broiler',
  'broiler|provita|lohmannmeatindianrivermeat': 'provita-broiler',
  'broiler|aftab|ross308': 'aftab-broiler',
  'broiler|newhope|ross308': 'newhope-broiler',
  'broiler|advance|ross308': 'advance-broiler',
  'broiler|akij|ep': 'akij-broiler',
  'broiler|aman|ross308': 'aman-broiler',
  'broiler|rmr|ross308': 'rmr-broiler',
  'colour|nahar|shornali': 'nahar-sonali',
  'colour|diamond|hubbardja57supercolor': 'diamond-color',
  'colour|planet|hubbardja57': 'planet-color',
  'colour|akij|hubbardpremiumja75': 'akij-color',
  'colour|paragon|hubbardja57': 'paragon-color',
  'colour|kazi|tsasso': 'kazi-sasso',
  'sonali|rmr|hybridsonali': 'rmr-sonali-hybrid',
  'sonali|rmr|normalsonali': 'rmr-sonali-normal',
  'sonali|rmr|fayoumi': 'rmr-fayoumi',
  'layer|kazi|hylinebrownfemale': 'kazi-layer-brown',
  'layer|paragon|novogenbrown': 'paragon-layer-brown',
  'layer|paragon|novogenwhite': 'paragon-layer-white',
  'layer|nahar|shaver579brown': 'nahar-layer-brown',
  'layer|nahar|lohmanwhite': 'nahar-layer-white',
  'layer|provita|isabrown': 'provita-layer-brown',
  'layer|cp|isabrown': 'cp-layer-brown'
};

const COMPANY_KEY = (c) => {
  const k = norm(c);
  if (k.startsWith('kazi')) return 'kazi';
  if (k === 'cp') return 'cp';
  if (k.startsWith('newhope')) return 'newhope';
  return k;
};

// Bangla names for companies that may need a new item
const COMPANY_BN = {
  kazi: 'কাজী ফার্মস', paragon: 'প্যারাগন গ্রুপ', provita: 'প্রভিটা গ্রুপ', advance: 'এডভান্স পোল্ট্রি', planet: 'প্ল্যানেট পোল্ট্রি',
  nahar: 'নাহার এগ্রো', cp: 'সিপি বাংলাদেশ', index: 'ইনডেক্স', nourish: 'নারিশ পোল্ট্রি', aman: 'আমান পোল্ট্রি', rmr: 'আরএমআর পোল্ট্রি',
  astha: 'আস্থা', peoples: 'পিপলস', newhope: 'নিউ হোপ', dg: 'ডিজি', abir: 'আবির', aftab: 'আফতাব বহুমুখী', akij: 'আকিজ পোল্ট্রি',
  diamond: 'ডায়মন্ড পোল্ট্রি', quality: 'কোয়ালিটি ব্রিডার্স', rrp: 'আরআরপি', local: 'লোকাল'
};

const categoryOf = (excelCat, breed) => {
  const c = norm(excelCat);
  if (c.startsWith('broiler')) return 'broiler';
  if (c.startsWith('layer')) return /white/i.test(breed) ? 'layer_white' : 'layer_brown';
  return 'sonali'; // Colour Bird and Sonali are one group on the site
};

const EXCEL_CATS = ['broiler', 'layer', 'colour', 'color', 'sonali'];
const excelCatKey = (v) => {
  const k = norm(v);
  const hit = EXCEL_CATS.find((c) => k.startsWith(c));
  return hit === 'color' ? 'colour' : hit || null;
};

const cleanBreed = (b) => String(b ?? '').replace(/\s+/g, ' ').trim();

const parseSheetDate = (name) => {
  const m = String(name).match(/(\d{1,2})[-./](\d{1,2})[-./](\d{4})/);
  if (!m) return null;
  const [, d, mo, y] = m;
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
};

const num = (v) => {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(/,/g, '').trim());
  return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * `sheets` = [{ sheet: '21-11-2026', data: [[...], ...] }] as returned by read-excel-file.
 * Returns the date sheets, oldest first: { name, dateISO, columns: [{ key, excelCat, company, breed, zones, count }] }.
 */
export function parseCompetitorWorkbook(sheets) {
  const out = [];
  for (const s of sheets) {
    const dateISO = parseSheetDate(s.sheet);
    if (!dateISO) continue;
    const data = s.data || [];
    const at = (r, c) => (data[r - 1] ? data[r - 1][c - 1] : null);
    const width = Math.max(0, ...data.slice(5, 10).map((row) => (row ? row.length : 0)));

    // zone rows: the zone name sits in column B (2)
    const zoneRows = [];
    for (let r = 10; r <= Math.min(data.length, 60); r++) {
      const id = zoneIdFromName(at(r, 2));
      if (id) zoneRows.push({ r, id });
    }

    const columns = [];
    let cat = 'broiler';
    let company = '';
    for (let c = 1; c <= width; c++) {
      const catKey = excelCatKey(at(6, c));
      if (catKey) cat = catKey;
      const comp = at(7, c);
      if (comp != null && String(comp).trim()) company = String(comp).trim();
      if (!/^prs/i.test(String(at(9, c) ?? '').trim())) continue; // only the "Prs" (present) column holds rates
      if (c < 6) continue; // the zone/officer columns on the left
      const breed = cleanBreed(at(8, c));
      const zones = {};
      for (const { r, id } of zoneRows) {
        const v = num(at(r, c));
        if (v) zones[id] = v;
      }
      const count = Object.keys(zones).length;
      const ck = COMPANY_KEY(company);
      columns.push({ key: `${cat}|${ck}|${norm(breed)}`, excelCat: cat, company, companyKey: ck, breed, zones, count });
    }
    out.push({ name: String(s.sheet).trim(), dateISO, columns });
  }
  return out.sort((a, b) => a.dateISO.localeCompare(b.dateISO));
}

const slug = (s) => norm(s).slice(0, 40) || 'x';

/**
 * Plan what applying `sheet` would do to `items`. `earlierSheets` = the sheets dated before it, oldest first.
 * Returns rows: { key, label, itemId, isNew, count, todayRate, divisionRates, prevRate, zones, column }
 * plus `untouched` (site items with no data in this sheet).
 */
export function planExcelImport(sheet, earlierSheets, items) {
  const byId = new Map(items.map((i) => [i.id, i]));
  // "yesterday" = the most recent earlier sheet that has this column
  const prevByKey = new Map();
  for (const s of earlierSheets || []) for (const c of s.columns) if (c.count) prevByKey.set(c.key, c); // later sheets overwrite earlier ones
  const used = new Set();
  const rows = [];
  for (const col of sheet.columns) {
    if (!col.count) continue;
    const mapped = ITEM_MAP[col.key];
    const existing = mapped && byId.has(mapped) && !used.has(mapped) ? byId.get(mapped) : null;
    const { divisionRates, todayRate } = deriveFromZones(col.zones);
    const prev = prevByKey.get(col.key);
    const prevRate = prev ? deriveFromZones(prev.zones).todayRate : null;
    const label = `${col.company} — ${col.breed || '—'}`;
    if (existing) used.add(existing.id);
    rows.push({
      key: col.key,
      label,
      itemId: existing ? existing.id : `xl-${slug(col.companyKey)}-${slug(col.breed)}`,
      isNew: !existing,
      current: existing ? existing.todayRate : null,
      count: col.count,
      todayRate,
      divisionRates,
      prevRate,
      column: col
    });
  }
  const touched = new Set(rows.filter((r) => !r.isNew).map((r) => r.itemId));
  const untouched = items.filter((i) => !touched.has(i.id));
  return { rows, untouched };
}

/** Apply the (checked) plan rows to the items and return the new items array. */
export function applyExcelPlan(items, rows, { dateISO, previousDateISO, bookingPhone }) {
  const byId = new Map(rows.map((r) => [r.itemId, r]));
  const dayChanged = Boolean(previousDateISO) && previousDateISO !== dateISO;
  const updated = items.map((item) => {
    const row = byId.get(item.id);
    if (!row || row.isNew) return item;
    return {
      ...item,
      todayRate: row.todayRate,
      yesterdayRate: row.prevRate ?? (dayChanged ? item.todayRate : item.yesterdayRate),
      divisionRates: row.divisionRates,
      status: 'available'
    };
  });
  const added = rows.filter((r) => r.isNew).map((row) => {
    const col = row.column;
    return {
      id: row.itemId,
      company: `${COMPANY_BN[col.companyKey] || col.company} (${col.company})`,
      companyEn: col.company,
      category: categoryOf(col.excelCat, col.breed),
      breed: col.breed,
      todayRate: row.todayRate,
      yesterdayRate: row.prevRate ?? row.todayRate,
      status: 'available',
      minBooking: 500,
      bookingPhone: bookingPhone || '',
      notes: '',
      divisionRates: row.divisionRates,
      verified: true
    };
  });
  return [...updated, ...added];
}

export const ZONE_COUNT = ZONES.length;
