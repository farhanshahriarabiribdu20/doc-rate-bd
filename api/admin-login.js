import { handleAdminLogin, isAdminConfigured, isTwoFactorOn, noStore, parseBody } from './_lib.js';

// GET  -> { configured, twofa }   (public: lets the UI show setup instructions)
// POST -> password in `x-admin-key` (+ `code` in the body when 2-step verification is on) -> { token? }
export default async function handler(req, res) {
  noStore(res);

  if (req.method === 'GET') {
    return res.status(200).json({ success: true, configured: isAdminConfigured(), twofa: isTwoFactorOn() });
  }

  if (req.method === 'POST') return handleAdminLogin(req, res, parseBody(req) || {});

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
