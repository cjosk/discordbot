import { DISCORD_GUILD_ID, DISCORD_MEMBER_ROLE_IDS } from '../src/authConfig.js';
import { GUILD_NAME } from '../src/appConfig.js';
import { HttpError } from './_error.js';
import { enforceRateLimit, getClientIp } from './_rateLimit.js';
import { resolveServerUserRole } from './_roleResolver.js';
import { createSessionToken } from './_session.js';

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || '';
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || '';
const DISCORD_FETCH_TIMEOUT_MS = 10_000;

const normalizeOrigin = (value) => String(value || '').trim().replace(/\/+$/, '');

const getRequestOrigin = (req) => {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').trim();
  const protocol = normalizeOrigin(forwardedProto || (process.env.NODE_ENV === 'development' ? 'http' : 'https'));
  const host = normalizeOrigin(req.headers['x-forwarded-host'] || req.headers.host || '');

  if (!host) {
    return '';
  }

  return `${protocol}://${host}`;
};

const getTimeoutSignal = () =>
  typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
    ? AbortSignal.timeout(DISCORD_FETCH_TIMEOUT_MS)
    : undefined;

const fetchDiscordJson = async (url, init = {}, errorMessage = 'Discord request failed.') => {
  try {
    return await fetch(url, {
      ...init,
      signal: init.signal || getTimeoutSignal(),
    });
  } catch (error) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      throw new HttpError(504, errorMessage);
    }

    throw error;
  }
};

const hasRequiredGuildRole = (memberRoleIds = []) => {
  if (DISCORD_MEMBER_ROLE_IDS.length === 0) {
    return true;
  }

  return memberRoleIds.some((roleId) => DISCORD_MEMBER_ROLE_IDS.includes(roleId));
};

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed.' });
    }

    await enforceRateLimit({
      scope: 'discord-token',
      ip: getClientIp(req),
      limit: 12,
      windowMs: 60_000,
      message: 'Discord login rate limit exceeded. Please try again shortly.',
    });

    if (!DISCORD_CLIENT_ID) {
      return res.status(500).json({ error: 'Discord client id is not configured.' });
    }

    const { code, codeVerifier, redirectUri } = req.body || {};
    if (!code || !codeVerifier || !redirectUri) {
      return res.status(400).json({ error: 'Missing OAuth exchange parameters.' });
    }

    const normalizedRedirectUri = normalizeOrigin(redirectUri);
    const expectedOrigin = getRequestOrigin(req);
    if (!normalizedRedirectUri || !expectedOrigin || normalizedRedirectUri !== expectedOrigin) {
      return res.status(400).json({ error: 'Invalid redirect origin.' });
    }

    const body = new URLSearchParams({
      client_id: DISCORD_CLIENT_ID,
      grant_type: 'authorization_code',
      code,
      redirect_uri: normalizedRedirectUri,
      code_verifier: codeVerifier,
    });

    if (DISCORD_CLIENT_SECRET) {
      body.set('client_secret', DISCORD_CLIENT_SECRET);
    }

    const response = await fetchDiscordJson('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    }, 'Discord token exchange timed out.');

    const payload = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({
        error: payload?.error_description || payload?.error || 'Discord token exchange failed.',
      });
    }

    const discordToken = payload.access_token;

    const userRes = await fetchDiscordJson('https://discord.com/api/users/@me', {
      headers: { authorization: `Bearer ${discordToken}` },
    }, 'Discord profile lookup timed out.');
    if (!userRes.ok) {
      return res.status(401).json({ error: 'Failed to fetch Discord profile.' });
    }

    const user = await userRes.json();

    const memberRes = await fetchDiscordJson(
      `https://discord.com/api/users/@me/guilds/${DISCORD_GUILD_ID}/member`,
      {
        headers: { authorization: `Bearer ${discordToken}` },
      },
      'Discord guild membership lookup timed out.',
    );

    if (memberRes.status === 404) {
      return res.status(403).json({ error: 'Access denied: not a guild member.' });
    }
    if (!memberRes.ok) {
      return res.status(403).json({ error: 'Failed to verify guild membership.' });
    }

    const member = await memberRes.json();
    const memberRoleIds = Array.isArray(member.roles) ? member.roles : [];
    if (!hasRequiredGuildRole(memberRoleIds)) {
      return res.status(403).json({ error: 'Access denied: missing required guild role.' });
    }

    const resolvedRole = await resolveServerUserRole({
      discordId: user.id,
      memberRoleIds,
    });

    const sessionUser = {
      id: user.id,
      username: user.username,
      global_name: user.global_name,
      avatar: user.avatar,
      guild_name: GUILD_NAME,
      member_role_ids: memberRoleIds,
      role: resolvedRole,
    };

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      token: createSessionToken(sessionUser),
      user: sessionUser,
    });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    return res.status(status).json({ error: error.message || 'Discord token exchange failed.' });
  }
}
