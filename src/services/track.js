// Anonymous usage counters for the admin dashboard: event names only (no IP, no cookies, no personal data).
// Events are queued and sent in one small request every few seconds, and when the tab is hidden.

const queue = [];
let timer = null;

const flush = () => {
  timer = null;
  if (!queue.length) return;
  const events = queue.splice(0, 25);
  const body = JSON.stringify({ action: 'events', events });
  try {
    if (document.visibilityState === 'hidden' && navigator.sendBeacon) {
      navigator.sendBeacon('/api/live-visitors', new Blob([body], { type: 'application/json' }));
    } else {
      fetch('/api/live-visitors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
    }
  } catch { /* statistics must never break the page */ }
  if (queue.length) timer = setTimeout(flush, 2000);
};

/** Count one event, e.g. track('tab:market'). Names: a-z 0-9 _ : . - (max 40). */
export function track(name) {
  if (typeof name !== 'string') return;
  const clean = name.toLowerCase().replace(/[^a-z0-9_:.-]/g, '').slice(0, 40);
  if (!clean) return;
  queue.push(clean);
  if (!timer) timer = setTimeout(flush, 5000);
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
}

const sourceOf = () => {
  try {
    const ref = document.referrer ? new URL(document.referrer).hostname : '';
    if (!ref || ref === location.hostname) return 'direct';
    if (/facebook|fb\.com|fb\.me/.test(ref)) return 'facebook';
    if (/whatsapp|wa\.me/.test(ref)) return 'whatsapp';
    if (/t\.me|telegram/.test(ref)) return 'telegram';
    if (/google|bing|duckduckgo/.test(ref)) return 'search';
    if (/youtube|youtu\.be/.test(ref)) return 'youtube';
    return 'other';
  } catch { return 'direct'; }
};

/** Once per browser session: a visit, where it came from, and the device type. */
export function trackVisit() {
  try {
    if (sessionStorage.getItem('fn_visit_tracked')) return;
    sessionStorage.setItem('fn_visit_tracked', '1');
  } catch { /* private mode: count every load */ }
  track('visit');
  track(`src:${sourceOf()}`);
  track(`dev:${window.matchMedia?.('(max-width: 767px)').matches ? 'mobile' : 'desktop'}`);
}
