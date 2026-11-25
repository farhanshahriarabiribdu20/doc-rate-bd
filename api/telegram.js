import { timingSafeEqual } from 'node:crypto';
import { getDoc } from './_store.js';
import { parseBody, requireAdmin } from './_lib.js';
import { readTrend } from './_days.js';
import { readFresh, writeFresh } from './_fresh.js';
import { weeklySummary, weeklyText } from '../src/utils/weeklySummary.js';

const WEEKLY_PATH = 'telegram-weekly.json';

const cronAllowed = (req) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // the once-per-week marker below already caps what a stranger could trigger
  const given = String(req.headers?.authorization || '');
  const want = `Bearer ${secret}`;
  return given.length === want.length && timingSafeEqual(Buffer.from(given), Buffer.from(want));
};

async function sendToChannel(text) {
  const r = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text, disable_web_page_preview: true })
  });
  const out = await r.json().catch(() => ({}));
  return r.ok && out.ok ? null : (out.description || `Telegram HTTP ${r.status}`);
}

// Weekly summary: only when the admin turned on "auto post" (settings.telegramAuto), at most once per last-rate date.
async function weeklyCron(res) {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) return res.status(200).json({ success: true, skipped: 'not_configured' });
  const data = await getDoc('site-data.json').catch(() => null);
  if (data?.settings?.telegramAuto !== true) return res.status(200).json({ success: true, skipped: 'auto_off' });
  const summary = weeklySummary(await readTrend());
  if (!summary) return res.status(200).json({ success: true, skipped: 'not_enough_data' });
  const marker = await readFresh(WEEKLY_PATH);
  if (marker?.to === summary.to) return res.status(200).json({ success: true, skipped: 'already_posted' });
  const err = await sendToChannel(weeklyText(summary));
  if (err) return res.status(502).json({ success: false, error: err });
  await writeFresh(WEEKLY_PATH, { to: summary.to, at: new Date().toISOString() }, marker?.v);
  return res.status(200).json({ success: true, posted: summary.to });
}

// POST (admin) { text } -> posts the day's rate message to the site's Telegram channel.
// Needs two Vercel environment variables:
//   TELEGRAM_BOT_TOKEN  token from @BotFather
//   TELEGRAM_CHAT_ID    the channel, e.g. @fosholnexa_rates (the bot must be an admin of the channel)
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'GET' && req.query?.cron) {
      if (!cronAllowed(req)) return res.status(401).json({ success: false, error: 'Unauthorized' });
      return await weeklyCron(res);
    }
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
    if (!(await requireAdmin(req, res))) return;
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chat = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chat) return res.status(503).json({ success: false, error: 'not_configured' });

    const body = parseBody(req);
    const text = typeof body?.text === 'string' ? body.text.replace(/\*/g, '').trim().slice(0, 3900) : '';
    if (!text) return res.status(400).json({ success: false, error: 'text is required' });

    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true })
    });
    const out = await r.json().catch(() => ({}));
    if (!r.ok || !out.ok) return res.status(502).json({ success: false, error: out.description || `Telegram HTTP ${r.status}` });
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('telegram API error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
