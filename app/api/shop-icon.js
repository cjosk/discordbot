import { HttpError } from './_error.js';
import { enforceRateLimit, getClientIp } from './_rateLimit.js';
import { APP_USER_AGENT } from '../src/appConfig.js';

const buildRenderUrl = (uniqueName) =>
  `https://render.albiononline.com/v1/item/${encodeURIComponent(uniqueName)}.png?quality=0&size=64&locale=en`;

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      throw new HttpError(405, 'Method not allowed.');
    }

    await enforceRateLimit({
      scope: 'shop-icon',
      ip: getClientIp(req),
      limit: 240,
      windowMs: 60_000,
      message: 'Shop icon rate limit exceeded. Please try again shortly.',
    });

    const item = String(req.query?.item || '').trim();
    if (!/^T\d+_[A-Z0-9_]+(?:@\d+)?$/i.test(item)) {
      throw new HttpError(400, 'Invalid item id.');
    }

    const response = await fetch(buildRenderUrl(item), {
      headers: { 'User-Agent': APP_USER_AGENT },
    });

    if (!response.ok) {
      throw new HttpError(response.status, 'Item icon fetch failed.');
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400');
    return res.status(200).send(buffer);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    return res.status(status).json({ error: error.message || 'Unexpected icon proxy error.' });
  }
}
