import { parseBody, requireAdmin } from './_lib.js';

// POST (admin) { text } -> posts the day's rate message to the site's Telegram channel.
// Needs two Vercel environment variables:
//   TELEGRAM_BOT_TOKEN  token from @BotFather
//   TELEGRAM_CHAT_ID    the channel, e.g. @fosholnexa_rates (the bot must be an admin of the channel)
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
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
