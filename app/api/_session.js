import crypto from 'node:crypto';

import { HttpError } from './_error.js';

const SESSION_TTL_SECONDS = 60 * 60 * 2;

const getSessionSecret = () =>
  process.env.SESSION_SECRET ||
  process.env.DISCORD_CLIENT_SECRET ||
  '';

const toBase64Url = (value) =>
  Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

const fromBase64Url = (value) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, 'base64').toString('utf8');
};

const sign = (payload) =>
  crypto.createHmac('sha256', getSessionSecret()).update(payload).digest('base64url');

export const createSessionToken = (user) => {
  const secret = getSessionSecret();
  if (!secret) {
    throw new HttpError(500, 'SESSION_SECRET or DISCORD_CLIENT_SECRET is not configured.');
  }

  const payload = {
    ...user,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };

  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
};

export const verifySessionToken = (token) => {
  const secret = getSessionSecret();
  if (!secret) {
    throw new HttpError(500, 'SESSION_SECRET or DISCORD_CLIENT_SECRET is not configured.');
  }

  if (!token || !token.includes('.')) {
    throw new HttpError(401, 'Invalid session token.');
  }

  const [encodedPayload, signature] = token.split('.');
  const expectedSignature = sign(encodedPayload);
  const signatureBuffer = Buffer.from(signature || '');
  const expectedBuffer = Buffer.from(expectedSignature);

  if (!signature || signatureBuffer.length !== expectedBuffer.length) {
    throw new HttpError(401, 'Invalid session signature.');
  }

  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    throw new HttpError(401, 'Invalid session signature.');
  }

  const payload = JSON.parse(fromBase64Url(encodedPayload));
  if (!payload?.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    throw new HttpError(401, 'Session expired.');
  }

  return payload;
};
