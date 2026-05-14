import { authenticateRequest } from './_auth.js';
import { HttpError } from './_error.js';
import { enforceUserRateLimit } from './_rateLimit.js';
import { APP_USER_AGENT } from '../src/appConfig.js';

const GOLD_PRICE_URL = 'https://europe.albion-online-data.com/api/v2/stats/gold?count=1';
const GOLD_CACHE_TTL_MS = 60_000;

let goldPriceCache = {
  price: 0,
  fetchedAt: 0,
};

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      throw new HttpError(405, 'Method not allowed.');
    }

    const auth = await authenticateRequest(req);
    await enforceUserRateLimit(req, auth.user.id, {
      scope: 'gold-price',
      limit: 30,
      windowMs: 60_000,
      message: 'Gold price rate limit exceeded. Please try again shortly.',
    });

    const now = Date.now();
    if (goldPriceCache.fetchedAt && now - goldPriceCache.fetchedAt < GOLD_CACHE_TTL_MS) {
      res.setHeader('Cache-Control', 'private, max-age=30, stale-while-revalidate=30');
      return res.status(200).json(goldPriceCache);
    }

    const response = await fetch(GOLD_PRICE_URL, {
      headers: { 'User-Agent': APP_USER_AGENT },
    });

    if (!response.ok) {
      throw new HttpError(response.status, 'Gold price fetch failed.');
    }

    const data = await response.json();
    const price = Array.isArray(data) && data.length > 0 ? Number(data[0]?.price) || 0 : 0;

    goldPriceCache = {
      price,
      fetchedAt: now,
    };

    res.setHeader('Cache-Control', 'private, max-age=30, stale-while-revalidate=30');
    return res.status(200).json(goldPriceCache);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    return res.status(status).json({ error: error.message || 'Unexpected gold price error.' });
  }
}
