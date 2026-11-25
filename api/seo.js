import { getDoc } from './_store.js';
import { INITIAL_RATES, SITE_SETTINGS, DIVISIONS } from '../src/data/initialData.js';
import { rateForRegion } from '../src/data/zones.js';
import { formatBn, toBnDigits } from '../src/utils/date.js';

// Search-engine friendly pages, one function so we stay inside the Vercel function limit:
//   GET /rate/<slug>   (rewritten to /api/seo?slug=<slug>)  -> static HTML page for one company rate
//   GET /sitemap.xml   (rewritten to /api/seo?sitemap=1)    -> sitemap of the home page + every company page
// Both are edge-cached, so crawlers and visitors rarely reach Blob storage.

const SITE_URL = (process.env.SITE_URL || 'https://fosholnexa.com').replace(/\/$/, '');

const CATEGORY_BN = { broiler: 'ব্রয়লার', sonali: 'সোনালী', layer_brown: 'লেয়ার (ব্রাউন)', layer_white: 'লেয়ার (হোয়াইট)', cockerel: 'ককরেল' };
const STATUS_BN = { available: 'প্রস্তুত', booking_open: 'বুকিং চালু', limited: 'সীমিত স্টক' };

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const bn = (v) => toBnDigits(Math.round(Number(v) || 0));

export const slugify = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

async function readPublished() {
  try {
    const data = await getDoc('site-data.json');
    return data && typeof data === 'object' ? data : null;
  } catch {
    return null;
  }
}

/** Today's rates with a unique URL slug each. */
export async function loadRates() {
  const data = await readPublished();
  const settings = { ...SITE_SETTINGS, ...(data?.settings || {}) };
  if (settings.reportDateISO) settings.reportDateBn = formatBn(settings.reportDateISO);
  const all = Array.isArray(data?.rates) && data.rates.length ? data.rates : INITIAL_RATES;
  const live = all.filter((r) => !r.rateDate || r.rateDate === settings.reportDateISO);
  const used = new Set();
  const rates = live.map((r) => {
    let slug = slugify(`${r.companyEn || r.company} ${r.breed}`) || slugify(r.id) || 'rate';
    let i = 2;
    const base = slug;
    while (used.has(slug)) slug = `${base}-${i++}`;
    used.add(slug);
    return { ...r, slug };
  });
  return { rates, settings };
}

export function renderPage(item, rates, settings) {
  const name = item.company || item.companyEn;
  const dateShort = String(settings.reportDateBn || '').replace(/\s*\(.*\)\s*$/, '');
  const title = `${name} ${item.breed} বাচ্চার আজকের রেট ৳${bn(item.todayRate)} (${dateShort}) | FosholNexa BD`;
  const desc = `${name} (${item.breed}) এক দিনের বাচ্চার আজকের বাজারদর ৳${bn(item.todayRate)}। বিভাগভিত্তিক রেট, গতকালের পরিবর্তন ও বুকিংয়ের তথ্য। ${dateShort} হালনাগাদ।`;
  const url = `${SITE_URL}/rate/${item.slug}`;
  const diff = Number(item.todayRate) - Number(item.yesterdayRate);
  const diffText = !Number(item.yesterdayRate) || diff === 0 ? 'গতকালের মতোই' : diff > 0 ? `গতকালের চেয়ে ৳${bn(diff)} বেশি` : `গতকালের চেয়ে ৳${bn(-diff)} কম`;
  const phone = String(item.bookingPhone || settings.whatsapp || settings.hotline || '').replace(/[^\d+]/g, '');
  const divisions = DIVISIONS.filter((d) => d.id !== 'all').map((d) => ({ name: d.nameBn.split(' (')[0], rate: rateForRegion(item, d.id) }));
  const same = rates.filter((r) => r.category === item.category && r.slug !== item.slug);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${name} ${item.breed} (এক দিনের বাচ্চা)`,
    category: CATEGORY_BN[item.category] || item.category,
    brand: { '@type': 'Brand', name: item.companyEn || name },
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'BDT',
      price: Number(item.todayRate) || 0,
      availability: item.status === 'limited' ? 'https://schema.org/LimitedAvailability' : 'https://schema.org/InStock'
    }
  };

  return `<!doctype html>
<html lang="bn">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${SITE_URL}/icon-512.png">
<meta name="theme-color" content="#0c2116">
<link rel="icon" href="/logo.jpg">
<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>
<style>
*{box-sizing:border-box}body{margin:0;font-family:'Hind Siliguri','Noto Sans Bengali',system-ui,sans-serif;background:#f8fafc;color:#0f172a;line-height:1.6}
header{background:#0c2116;color:#fff;padding:14px 16px}header a{color:#fff;text-decoration:none;font-weight:800}
main{max-width:760px;margin:0 auto;padding:20px 16px 48px}
h1{font-size:1.5rem;margin:.2rem 0}h2{font-size:1.1rem;margin:1.6rem 0 .6rem}
.card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:18px;margin-top:14px}
.rate{font-size:2.6rem;font-weight:800;color:#047857;line-height:1.1}.muted{color:#64748b;font-size:.9rem}
table{width:100%;border-collapse:collapse}td,th{padding:9px 6px;border-top:1px solid #e2e8f0;text-align:left}th{border-top:0;color:#64748b;font-size:.85rem}td:last-child,th:last-child{text-align:right;font-weight:700}
.btn{display:inline-block;background:#047857;color:#fff;text-decoration:none;padding:11px 18px;border-radius:12px;font-weight:700;margin:6px 6px 0 0}.btn.alt{background:#f59e0b;color:#0f172a}
ul{padding:0;list-style:none;margin:0}li a{display:flex;justify-content:space-between;padding:10px 0;border-top:1px solid #e2e8f0;color:#0f172a;text-decoration:none}li a b{color:#047857}
footer{text-align:center;color:#64748b;font-size:.8rem;padding:20px}
</style>
</head>
<body>
<header><a href="/">${esc(settings.brandName || 'FosholNexa BD')}</a></header>
<main>
<nav class="muted"><a href="/">হোম</a> › বাচ্চার রেট › ${esc(name)}</nav>
<h1>${esc(name)} — ${esc(item.breed)}</h1>
<p class="muted">${esc(CATEGORY_BN[item.category] || '')} বাচ্চা · ${esc(STATUS_BN[item.status] || '')} · হালনাগাদ: ${esc(settings.reportDateBn)}</p>
<div class="card">
<div class="muted">আজকের জাতীয় রেট (প্রতি পিস)</div>
<div class="rate">৳${bn(item.todayRate)}</div>
<div class="muted">${esc(diffText)}${item.yesterdayRate ? ` (গতকাল ৳${bn(item.yesterdayRate)})` : ''}</div>
${item.notes ? `<p>${esc(item.notes)}</p>` : ''}
<a class="btn" href="/">সব কোম্পানির আজকের রেট</a>${phone ? `<a class="btn alt" href="tel:${esc(phone)}">বুকিংয়ের জন্য কল করুন</a>` : ''}
</div>
<h2>বিভাগভিত্তিক রেট</h2>
<div class="card"><table><thead><tr><th>বিভাগ</th><th>রেট (৳)</th></tr></thead><tbody>
${divisions.map((d) => `<tr><td>${esc(d.name)}</td><td>৳${bn(d.rate)}</td></tr>`).join('\n')}
</tbody></table></div>
${item.minBooking ? `<p class="muted">ন্যূনতম বুকিং: ${bn(item.minBooking)} পিস। বুকিংয়ের আগে আজকের সঠিক রেট ফোনে নিশ্চিত করুন।</p>` : ''}
${same.length ? `<h2>একই ধরনের অন্যান্য কোম্পানির আজকের রেট</h2><div class="card"><ul>${same.map((r) => `<li><a href="/rate/${esc(r.slug)}"><span>${esc(r.company || r.companyEn)} (${esc(r.breed)})</span><b>৳${bn(r.todayRate)}</b></a></li>`).join('')}</ul></div>` : ''}
</main>
<footer>© ${esc(settings.brandName || 'FosholNexa BD')} · ${esc(settings.taglineBn || '')}</footer>
</body>
</html>`;
}

export function renderSitemap(rates, settings) {
  const last = settings.reportDateISO || new Date().toISOString().slice(0, 10);
  const urls = [{ loc: `${SITE_URL}/`, pri: '1.0' }, ...rates.map((r) => ({ loc: `${SITE_URL}/rate/${r.slug}`, pri: '0.8' }))];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${esc(u.loc)}</loc><lastmod>${esc(last)}</lastmod><changefreq>daily</changefreq><priority>${u.pri}</priority></url>`)
    .join('\n')}\n</urlset>\n`;
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') return res.status(405).end();
    const q = req.query || {};
    const { rates, settings } = await loadRates();

    if (q.sitemap) {
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=3600');
      return res.status(200).send(renderSitemap(rates, settings));
    }

    const slug = slugify(q.slug);
    const item = rates.find((r) => r.slug === slug);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    if (!item) {
      res.setHeader('Cache-Control', 'public, s-maxage=60');
      res.setHeader('X-Robots-Tag', 'noindex');
      return res.status(404).send('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>পাওয়া যায়নি</title><p style="font-family:sans-serif;padding:24px">এই কোম্পানির রেট এখন নেই। <a href="/">আজকের সব রেট দেখুন</a></p>');
    }
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=1800');
    return res.status(200).send(renderPage(item, rates, settings));
  } catch (err) {
    console.error('seo API error:', err);
    return res.status(500).send('Internal server error');
  }
}
