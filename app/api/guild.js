import { authenticateRequest } from './_auth.js';
import { HttpError } from './_error.js';
import { enforceUserRateLimit } from './_rateLimit.js';
import { APP_USER_AGENT, getAlbionGuildMembersUrl, resolveAlbionGuildId } from '../src/appConfig.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed.' });
    }

    const auth = await authenticateRequest(req);
    await enforceUserRateLimit(req, auth.user.id, {
      scope: 'guild-proxy',
      limit: 20,
      windowMs: 60_000,
      message: 'Guild roster rate limit exceeded. Please try again shortly.',
    });

    const guildId = resolveAlbionGuildId(req.query?.guildId);
    if (!guildId) {
      throw new HttpError(500, 'Albion guild id is not configured.');
    }

    const fetchRes = await fetch(getAlbionGuildMembersUrl(guildId), {
      headers: { 'User-Agent': APP_USER_AGENT },
    });

    if (!fetchRes.ok) {
      return res.status(fetchRes.status).json({ error: 'Failed to fetch from GameInfo API' });
    }

    const data = await fetchRes.json();
    return res.status(200).json(data);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    return res.status(status).json({ error: error.message || 'Internal Server Error while proxying request' });
  }
}
