import { HttpError } from './_error.js';

const localBuckets = new Map();
let localBucketSweepCounter = 0;
const KV_REST_API_URL =
  process.env.KV_REST_API_URL
  || process.env.UPSTASH_REDIS_REST_URL
  || '';
const KV_REST_API_TOKEN =
  process.env.KV_REST_API_TOKEN
  || process.env.UPSTASH_REDIS_REST_TOKEN
  || '';

const getBucketKey = ({ scope = 'default', userId = '', ip = '' }) =>
  [scope, String(userId || 'anon'), String(ip || 'unknown')].join(':');

const maybeSweepLocalBuckets = (now) => {
  localBucketSweepCounter += 1;
  if (localBucketSweepCounter % 100 !== 0 && localBuckets.size < 1000) {
    return;
  }

  for (const [key, bucket] of localBuckets.entries()) {
    if (!bucket || now >= bucket.resetAt) {
      localBuckets.delete(key);
    }
  }
};

export const getClientIp = (req) => {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim()) {
    return realIp.trim();
  }

  return '';
};

const hasSharedKv = () => Boolean(KV_REST_API_URL && KV_REST_API_TOKEN);

const callKv = async (...parts) => {
  const path = parts.map((part) => encodeURIComponent(String(part))).join('/');
  const response = await fetch(`${KV_REST_API_URL}/${path}`, {
    headers: {
      Authorization: `Bearer ${KV_REST_API_TOKEN}`,
    },
  });

  if (!response.ok) {
    throw new HttpError(503, 'Shared rate limiter is unavailable.');
  }

  return response.json();
};

const enforceLocalRateLimit = ({
  scope,
  userId,
  ip,
  limit,
  windowMs,
  message,
}) => {
  const key = getBucketKey({ scope, userId, ip });
  const now = Date.now();
  maybeSweepLocalBuckets(now);
  const bucket = localBuckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    localBuckets.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return;
  }

  if (bucket.count >= limit) {
    throw new HttpError(429, message);
  }

  bucket.count += 1;
};

const enforceSharedRateLimit = async ({
  scope,
  userId,
  ip,
  limit,
  windowMs,
  message,
}) => {
  const bucketWindow = Math.floor(Date.now() / windowMs);
  const ttlSeconds = Math.max(1, Math.ceil(windowMs / 1000) + 5);
  const key = `ratelimit:${getBucketKey({ scope, userId, ip })}:${bucketWindow}`;

  const incrementPayload = await callKv('incr', key);
  const count = Number(incrementPayload?.result) || 0;

  if (count === 1) {
    await callKv('expire', key, ttlSeconds);
  }

  if (count > limit) {
    throw new HttpError(429, message);
  }
};

export const enforceRateLimit = async ({
  scope,
  userId,
  ip,
  limit,
  windowMs,
  message = 'Too many requests.',
}) => {
  if (hasSharedKv()) {
    try {
      await enforceSharedRateLimit({
        scope,
        userId,
        ip,
        limit,
        windowMs,
        message,
      });
      return;
    } catch (error) {
      if (error instanceof HttpError && error.status === 429) {
        throw error;
      }
    }
  }

  enforceLocalRateLimit({
    scope,
    userId,
    ip,
    limit,
    windowMs,
    message,
  });
};

export const enforceUserRateLimit = async (req, userId, options) =>
  enforceRateLimit({
    ...options,
    userId,
    ip: getClientIp(req),
  });
