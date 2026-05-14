import { syncGuildRosterOnServer } from './db.js';

const isAuthorizedCronRequest = (req) => {
  const cronSecret = String(process.env.CRON_SECRET || '').trim();
  if (!cronSecret) return false;

  const authHeader = req.headers?.authorization || req.headers?.Authorization || '';
  return authHeader === `Bearer ${cronSecret}`;
};

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed.' });
    }

    if (!isAuthorizedCronRequest(req)) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const result = await syncGuildRosterOnServer();
    return res.status(200).json({
      success: true,
      mode: 'daily_cron_sync',
      ...result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Cron sync failed.',
    });
  }
}
