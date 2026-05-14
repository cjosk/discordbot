import { HttpError } from './_error.js';
import { DISCORD_GUILD_ID, DISCORD_MEMBER_ROLE_IDS } from '../src/authConfig.js';
import { resolveUserRole } from '../src/roles.js';

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || '';
const MEMBER_CACHE_TTL_MS = 60_000;

const memberCache = new Map();
const memberLookupInflight = new Map();
let memberCacheSweepCounter = 0;

const getCacheKey = (userId) => String(userId || '').trim();

const maybeSweepMemberCache = (now) => {
  memberCacheSweepCounter += 1;
  if (memberCacheSweepCounter % 100 !== 0 && memberCache.size < 1000) {
    return;
  }

  for (const [key, cached] of memberCache.entries()) {
    if (!cached || cached.expiresAt <= now) {
      memberCache.delete(key);
    }
  }
};

const hasRequiredGuildRole = (memberRoleIds = []) => {
  if (DISCORD_MEMBER_ROLE_IDS.length === 0) {
    return true;
  }

  return memberRoleIds.some((roleId) => DISCORD_MEMBER_ROLE_IDS.includes(roleId));
};

export const getLiveGuildMember = async (userId) => {
  const normalizedUserId = getCacheKey(userId);
  if (!normalizedUserId) {
    return null;
  }

  if (!DISCORD_GUILD_ID || !DISCORD_BOT_TOKEN) {
    throw new HttpError(500, 'Discord live membership validation is not configured.');
  }

  const cached = memberCache.get(normalizedUserId);
  const now = Date.now();
  maybeSweepMemberCache(now);
  if (cached && cached.expiresAt > now) {
    return cached.member;
  }

  const existingLookup = memberLookupInflight.get(normalizedUserId);
  if (existingLookup) {
    return existingLookup;
  }

  // Initial app load triggers several protected API calls at once. Reuse the same
  // Discord lookup so one login does not fan out into multiple identical member fetches.
  const lookupPromise = (async () => {
    const response = await fetch(
      `https://discord.com/api/v10/guilds/${encodeURIComponent(DISCORD_GUILD_ID)}/members/${encodeURIComponent(normalizedUserId)}`,
      {
        headers: {
          Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
        },
      },
    );

    if (response.status === 404) {
      throw new HttpError(403, 'Access denied: not a guild member.');
    }

    if (response.status === 429) {
      throw new HttpError(503, 'Discord membership verification is temporarily rate limited.');
    }

    if (!response.ok) {
      throw new HttpError(503, 'Failed to verify guild membership.');
    }

    const member = await response.json();
    const roleIds = Array.isArray(member?.roles) ? member.roles : [];

    if (!hasRequiredGuildRole(roleIds)) {
      throw new HttpError(403, 'Access denied: missing required guild role.');
    }

    const normalizedMember = {
      ...member,
      roles: roleIds,
      resolvedRole: resolveUserRole(normalizedUserId, roleIds),
    };

    memberCache.set(normalizedUserId, {
      member: normalizedMember,
      expiresAt: Date.now() + MEMBER_CACHE_TTL_MS,
    });

    return normalizedMember;
  })();

  memberLookupInflight.set(normalizedUserId, lookupPromise);

  try {
    return await lookupPromise;
  } finally {
    memberLookupInflight.delete(normalizedUserId);
  }
};
