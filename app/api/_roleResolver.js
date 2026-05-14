import { ADMIN_PLAYER_NAMES, CHIEF_PLAYER_NAMES } from '../src/authConfig.js';
import { getHigherRole, resolveUserRole, ROLES } from '../src/roles.js';

const normalizeSupabaseUrl = (value) => {
  const trimmed = String(value || '').trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  return trimmed.endsWith('/rest/v1') ? trimmed : `${trimmed}/rest/v1`;
};

const SUPABASE_URL = normalizeSupabaseUrl(process.env.SUPABASE_URL || '');
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const ROLE_CACHE_TTL_MS = 60_000;

const roleCache = new Map();

const canResolveLinkedPlayerRole = () =>
  Boolean(SUPABASE_URL && SUPABASE_SERVICE_KEY && (ADMIN_PLAYER_NAMES.length > 0 || CHIEF_PLAYER_NAMES.length > 0));

const supabaseFetch = async (path) => {
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Supabase role lookup failed.');
  }

  return response;
};

const readJson = async (response) => {
  if (response.status === 204) return null;
  return response.json();
};

const getCachedRole = (discordId) => {
  const cached = roleCache.get(discordId);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    roleCache.delete(discordId);
    return null;
  }

  return cached.role;
};

const setCachedRole = (discordId, role) => {
  roleCache.set(discordId, {
    role,
    expiresAt: Date.now() + ROLE_CACHE_TTL_MS,
  });
};

const fetchLinkedPlayerName = async (discordId) => {
  const linkResponse = await supabaseFetch(
    `/discord_links?discord_id=eq.${encodeURIComponent(discordId)}&select=player_id&limit=1`,
  );
  const linkRows = await readJson(linkResponse);
  const playerId = Array.isArray(linkRows) ? String(linkRows[0]?.player_id || '').trim() : '';

  if (!playerId) {
    return '';
  }

  const playerResponse = await supabaseFetch(
    `/players?id=eq.${encodeURIComponent(playerId)}&select=name&limit=1`,
  );
  const playerRows = await readJson(playerResponse);
  return Array.isArray(playerRows) ? String(playerRows[0]?.name || '').trim() : '';
};

export const resolveServerUserRole = async ({
  discordId,
  memberRoleIds = [],
  fallbackRole = ROLES.MEMBER,
}) => {
  const baseRole = getHigherRole(fallbackRole, resolveUserRole(discordId, memberRoleIds));

  if (!discordId || !canResolveLinkedPlayerRole()) {
    return baseRole;
  }

  const cachedRole = getCachedRole(discordId);
  if (cachedRole) {
    return getHigherRole(baseRole, cachedRole);
  }

  try {
    const linkedPlayerName = await fetchLinkedPlayerName(discordId);
    const resolvedRole = resolveUserRole(discordId, memberRoleIds, linkedPlayerName);
    setCachedRole(discordId, resolvedRole);
    return getHigherRole(baseRole, resolvedRole);
  } catch {
    return baseRole;
  }
};
