import { readTrend } from './_days.js';

// GET (public) -> { days: { 'YYYY-MM-DD': { 'Company|Breed': rate } }, names: { key: { company, breed, category } } }
// Last ~31 archived DOC days in one small blob. Edge cached, so visitors cost almost nothing.
export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=900');
    const trend = await readTrend();
    return res.status(200).json({ success: true, ...trend });
  } catch (err) {
    console.error('rate-trend API error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
