import { isAdminConfigured, noStore, requireAdmin } from './_lib.js';

// GET  -> { configured }   (public: lets the UI show setup instructions)
// POST -> verifies the admin password sent in the `x-admin-key` header
export default async function handler(req, res) {
  noStore(res);

  if (req.method === 'GET') {
    return res.status(200).json({ success: true, configured: isAdminConfigured() });
  }

  if (req.method === 'POST') {
    if (!(await requireAdmin(req, res))) return;
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
