// Reads the "Ready Broiler & Color sheet" Excel (one sheet per date, one row per mokam/region)
// and turns one day's sheet into updated ready-market rates.

const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

const REGION_ALIASES = {
  chittagong: 'chattogram', comilla: 'cumilla', gopalganj: 'gopalgonj', barisal: 'barishal', bogra: 'bogura', sirajgonj: 'sirajganj'
};
const regionKey = (name) => {
  const k = norm(String(name ?? '').split('(')[0]);
  return REGION_ALIASES[k] || k;
};

const parseSheetDate = (name) => {
  const m = String(name).match(/(\d{1,2})[-./](\d{1,2})[-./](\d{4})/);
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null;
};

const num = (v) => {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(/,/g, '').trim());
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** 01329-662017, 1329662020, 8801335144693 -> 01329662017, 01329662020, 01335144693 */
export const cleanPhone = (v) => {
  let d = String(v ?? '').replace(/\D/g, '');
  if (d.startsWith('880')) d = d.slice(2);
  if (d.length === 10 && d.startsWith('1')) d = `0${d}`;
  return /^01\d{9}$/.test(d) ? d : '';
};

export const READY_FIELDS = [
  { key: 'broilerGrill', label: 'গ্রিল' },
  { key: 'broilerMedium', label: 'মিডিয়াম' },
  { key: 'broilerBig', label: 'বড়' },
  { key: 'colorBird', label: 'কালার' },
  { key: 'sonali', label: 'সোনালী' },
  { key: 'eggBrown', label: 'ডিম (বাদামী)' },
  { key: 'eggWhite', label: 'ডিম (সাদা)' },
  { key: 'psCull', label: 'পিএস-কাল' }
];

// which header text means which field (rows 2-3 of the sheet)
const fieldOfHeader = (h) => {
  if (h.includes('grill')) return 'broilerGrill';
  if (h.includes('medium')) return 'broilerMedium';
  if (h.includes('big')) return 'broilerBig';
  if (h.includes('color')) return 'colorBird';
  if (h.includes('sonali')) return 'sonali';
  if (h.includes('brown')) return 'eggBrown';
  if (h.includes('white')) return 'eggWhite';
  if (h.includes('cull')) return 'psCull';
  return null;
};

/**
 * `sheets` = [{ sheet: '21.11.2026', data: [[...], ...] }] from read-excel-file.
 * Returns the date sheets that look like a ready-market sheet, oldest first:
 * { name, dateISO, rows: [{ regionEn, officerName, officerPhone, values: {field: number} }] }
 */
export function parseReadyWorkbook(sheets) {
  const out = [];
  for (const s of sheets) {
    const dateISO = parseSheetDate(s.sheet);
    if (!dateISO) continue;
    const data = s.data || [];
    const at = (r, c) => (data[r - 1] ? data[r - 1][c - 1] : null);
    const width = Math.max(0, ...data.slice(0, 3).map((row) => (row ? row.length : 0)));

    let regionCol = 0;
    let officerCol = 0;
    let phoneCol = 0;
    const fieldCols = {};
    for (let c = 1; c <= width; c++) {
      const top = String(at(1, c) ?? '').toLowerCase();
      if (top.includes('region')) regionCol = c;
      else if (top.includes('officer')) officerCol = c;
      else if (top.includes('number')) phoneCol = c;
      const h = `${at(2, c) ?? ''} ${at(3, c) ?? ''}`.toLowerCase();
      const f = fieldOfHeader(h);
      if (f && !fieldCols[f]) fieldCols[f] = c;
    }
    if (!regionCol || Object.keys(fieldCols).length < 4) continue; // not a ready-market sheet

    const rows = [];
    for (let r = 4; r <= data.length; r++) {
      const regionEn = String(at(r, regionCol) ?? '').replace(/\s+/g, ' ').trim();
      if (!regionEn) continue;
      const values = {};
      for (const [f, c] of Object.entries(fieldCols)) {
        const v = num(at(r, c));
        if (v) values[f] = v;
      }
      if (!Object.keys(values).length) continue;
      rows.push({
        regionEn,
        officerName: officerCol ? String(at(r, officerCol) ?? '').replace(/\s+/g, ' ').trim() : '',
        officerPhone: phoneCol ? cleanPhone(at(r, phoneCol)) : '',
        values
      });
    }
    if (rows.length) out.push({ name: String(s.sheet).trim(), dateISO, rows });
  }
  return out.sort((a, b) => a.dateISO.localeCompare(b.dateISO));
}

const slug = (s) => norm(s).slice(0, 30) || 'x';

/**
 * Match the sheet's rows to the site's mokams (by region name; a region that appears twice, like
 * Gazipur, goes to its second site entry "Gazipur (Hub 2)"). Rows with no match become new mokams.
 * Returns { rows: [{ index, regionEn, itemId, isNew, current, next, changed }], untouched }.
 */
export function planReadyImport(sheet, readyRates) {
  const used = new Set();
  const rows = sheet.rows.map((row, index) => {
    const key = regionKey(row.regionEn);
    const item = readyRates.find((r) => !used.has(r.id) && regionKey(r.regionEn) === key);
    if (item) used.add(item.id);
    const current = item || null;
    const next = {};
    let changed = 0;
    for (const { key: f } of READY_FIELDS) {
      const v = row.values[f] ?? (current ? current[f] : 0) ?? 0;
      next[f] = v;
      if (current && Number(current[f]) !== Number(v)) changed += 1;
    }
    return {
      index,
      regionEn: row.regionEn,
      itemId: item ? item.id : `ready-${slug(row.regionEn)}${readyRates.some((r) => r.id === `ready-${slug(row.regionEn)}`) ? `-${index}` : ''}`,
      isNew: !item,
      current,
      next,
      changed: item ? changed : READY_FIELDS.length,
      officerName: row.officerName,
      officerPhone: row.officerPhone
    };
  });
  const untouched = readyRates.filter((r) => !used.has(r.id));
  return { rows, untouched };
}

/** Apply the (checked) plan rows to the ready rates and return the new array. */
export function applyReadyPlan(readyRates, rows) {
  const byId = new Map(rows.map((r) => [r.itemId, r]));
  const updated = readyRates.map((item) => {
    const row = byId.get(item.id);
    if (!row || row.isNew) return item;
    return {
      ...item,
      ...row.next,
      officerName: row.officerName || item.officerName,
      officerPhone: row.officerPhone || item.officerPhone
    };
  });
  const maxSerial = Math.max(0, ...readyRates.map((r) => Number(r.serial) || 0));
  const added = rows.filter((r) => r.isNew).map((row, i) => ({
    id: row.itemId,
    serial: maxSerial + i + 1,
    regionEn: row.regionEn,
    regionBn: row.regionEn,
    officerName: row.officerName,
    officerPhone: row.officerPhone,
    sonaliSuper: 0,
    ...row.next
  }));
  return [...updated, ...added];
}
