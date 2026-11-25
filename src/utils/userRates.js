// Rates sent by visitors go live at once. They are laid over the admin's published rates for display only
// (the admin's own data is never changed) and every such value is marked, so the site can tag it.
//
// Which one wins when both exist:
//  - the admin has no rate for that zone/field  -> the visitor's rate is shown
//  - the admin has one                           -> the visitor's rate is shown only if it is newer than the admin's last publish

const valid = (v) => Number.isFinite(Number(v)) && Number(v) > 0;
const newer = (at, updatedAt) => !updatedAt || !at || new Date(at).getTime() > new Date(updatedAt).getTime();

/** DOC rate items + visitor reports -> items where visitor rates are in place, flagged with userZones / userAll. */
export function applyUserDocRates(items, reports, updatedAt) {
  if (!reports?.length) return items;
  const byItem = new Map();
  for (const r of reports) (byItem.get(r.targetId) || byItem.set(r.targetId, []).get(r.targetId)).push(r);
  return items.map((item) => {
    const list = byItem.get(item.id);
    if (!list) return item;
    let next = item;
    for (const r of list) {
      if (!valid(r.value)) continue;
      if (r.zoneId) {
        if (valid(item.zoneRates?.[r.zoneId]) && !newer(r.at, updatedAt)) continue;
        next = { ...next, zoneRates: { ...(next.zoneRates || {}), [r.zoneId]: Number(r.value) }, userZones: { ...(next.userZones || {}), [r.zoneId]: true } };
      } else {
        if (!newer(r.at, updatedAt)) continue;
        next = { ...next, todayRate: Number(r.value), userAll: true };
      }
    }
    return next;
  });
}

/** Ready-market (mokam) items + visitor reports -> items with the visitor values in place, flagged with userFields. */
export function applyUserReadyRates(items, reports, updatedAt) {
  if (!reports?.length) return items;
  const byItem = new Map(reports.map((r) => [r.targetId, r]));
  return items.map((item) => {
    const r = byItem.get(item.id);
    if (!r) return item;
    const patch = {};
    const fields = {};
    for (const [key, value] of Object.entries(r.values || {})) {
      if (!valid(value)) continue;
      if (valid(item[key]) && !newer(r.at, updatedAt)) continue;
      patch[key] = Number(value);
      fields[key] = true;
    }
    return Object.keys(fields).length ? { ...item, ...patch, userFields: fields } : item;
  });
}
