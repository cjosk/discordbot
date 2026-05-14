import { authenticateRequest } from './_auth.js';
import { HttpError } from './_error.js';
import { ROLES } from '../src/roles.js';
import {
  buildDefaultRegearAmounts,
  normalizeRegearAmounts,
  REGEAR_ROLES,
} from '../src/regearConfig.js';
import {
  ALBION_GUILD_ID,
  APP_USER_AGENT,
  BATTLE_PASS_NAME,
  GUILD_NAME,
  SHOP_NAME,
  SITE_NAME,
  getAlbionGuildMembersUrl,
  resolveAlbionGuildId,
} from '../src/appConfig.js';
import {
  DEFAULT_BATTLE_PASS_DURATION_DAYS,
  DEFAULT_BATTLE_PASS_REWARDS,
  DEFAULT_BATTLE_PASS_SKIP_ALLOWANCE,
  computeBattlePassProgress,
  getBattlePassDateKey,
  getBattlePassRewardTitle,
  isBattlePassEligibleSplit,
  normalizeBattlePassReward,
  sortUniqueDateKeys,
} from '../src/battlePass.js';

const normalizeSupabaseUrl = (value) => {
  const trimmed = String(value || '').trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  return trimmed.endsWith('/rest/v1') ? trimmed : `${trimmed}/rest/v1`;
};

const SUPABASE_URL = normalizeSupabaseUrl(process.env.SUPABASE_URL || '');
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || '';
const DISCORD_APPROVAL_CHANNEL_ID =
  process.env.DISCORD_APPROVAL_CHANNEL_ID
  || process.env.DISCORD_SHOP_CHANNEL_ID
  || '1488349953905655951';
const DISCORD_HQ_CHANNEL_ID =
  process.env.DISCORD_HQ_CHANNEL_ID
  || DISCORD_APPROVAL_CHANNEL_ID;

const normalizeOrigin = (value) => String(value || '').trim().replace(/\/+$/, '');

const getRequestOrigin = (req) => {
  const forwardedProto = String(req?.headers?.['x-forwarded-proto'] || '').trim();
  const protocol = normalizeOrigin(forwardedProto || (process.env.NODE_ENV === 'development' ? 'http' : 'https'));
  const host = normalizeOrigin(req?.headers?.['x-forwarded-host'] || req?.headers?.host || '');

  if (!host) {
    return '';
  }

  return `${protocol}://${host}`;
};

const buildAppTabUrl = (req, tab) => {
  const origin = getRequestOrigin(req);
  if (!origin || !tab) return origin;

  return `${origin}/?tab=${encodeURIComponent(tab)}`;
};

const baseHeaders = {
  apikey: SUPABASE_SERVICE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  'Content-Type': 'application/json',
};

const requireSupabaseConfig = () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new HttpError(500, 'Supabase env vars are not configured.');
  }
};

const supabaseFetch = async (path, init = {}) => {
  requireSupabaseConfig();

  const response = await fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: {
      ...baseHeaders,
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    let message = 'Supabase request failed.';

    try {
      const payload = await response.json();
      message = payload?.message || payload?.error || message;
    } catch {
      // Ignore response parsing errors for non-JSON failures.
    }

    throw new HttpError(response.status, message);
  }

  return response;
};

const requireBodyValue = (value, message) => {
  if (value === undefined || value === null || value === '') {
    throw new HttpError(400, message);
  }
};

const sanitizeIds = (values) =>
  Array.isArray(values)
    ? values.filter((value) => typeof value === 'string' && value.trim().length > 0)
    : [];

const sanitizeText = (value, maxLength = 160) => String(value || '').trim().slice(0, maxLength);
const normalizeNickname = (value) => sanitizeText(value || '', 120).toLocaleLowerCase();
const isManualPlayerId = (value) => String(value || '').startsWith(MANUAL_PLAYER_ID_PREFIX);

const getPlayerLedgerState = (player = {}) => ({
  balance: Number(player.balance) || 0,
  loot_split: Number(player.loot_split) || 0,
  issued: Number(player.issued) || 0,
  compensations: Number(player.compensations) || 0,
  sets: Number(player.sets) || 0,
  trash: Number(player.trash) || 0,
  deposited: Number(player.deposited) || 0,
  withdrawn: Number(player.withdrawn) || 0,
});

const formatDiscordSilver = (value) =>
  new Intl.NumberFormat('en-US').format(Math.floor(Number(value) || 0));

const trimDiscordContent = (value, maxLength = 1900) => {
  const content = String(value || '').trim();
  if (content.length <= maxLength) return content;
  return `${content.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
};

const readJson = async (response) => {
  if (response.status === 204) return null;
  return response.json();
};

const getElevatedRoles = () => [ROLES.CHIEF, ROLES.ADMIN];
const isElevatedRole = (role) => getElevatedRoles().includes(role);
const SHOP_ORDER_MAX_ITEMS = 24;
const SHOP_ORDER_MAX_QUANTITY = 99;
const RESET_CONFIRMATION_TEXT = 'RESET_GUILD_DATA';
const MANUAL_PLAYER_ID_PREFIX = 'manual:';
const REGEAR_CONFIG_CONTENT_ID = 'system:regear-config';
const MEMBER_PLAYER_PUBLIC_SELECT = 'id,name,activity';
const MEMBER_PLAYER_PRIVATE_SELECT = 'id,balance,loot_split,issued,compensations,sets,trash,deposited,withdrawn';

const buildEqFilterQuery = (filters = {}) =>
  Object.entries(filters)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=eq.${encodeURIComponent(String(value))}`)
    .join('&');

const patchRows = async (path, payload, prefer = 'return=representation') => {
  const response = await supabaseFetch(path, {
    method: 'PATCH',
    headers: { Prefer: prefer },
    body: JSON.stringify(payload),
  });

  return readJson(response);
};

const deleteRows = async (path, prefer = 'return=minimal') => {
  const response = await supabaseFetch(path, {
    method: 'DELETE',
    headers: { Prefer: prefer },
  });

  return readJson(response);
};

const patchSingleRow = async ({ path, payload, errorStatus = 409, errorMessage }) => {
  const rows = await patchRows(path, payload);
  const row = Array.isArray(rows) ? rows[0] : rows;

  if (!row) {
    throw new HttpError(errorStatus, errorMessage || 'Conditional update failed.');
  }

  return row;
};

const claimPendingRecord = async ({ table, id, label }) =>
  patchSingleRow({
    path: `/${table}?${buildEqFilterQuery({ id, status: 'pending' })}`,
    payload: { status: 'processing' },
    errorStatus: 409,
    errorMessage: `${label} is already being processed or resolved.`,
  });

const finalizeProcessedRecord = async ({ table, id, status, extra = {}, label }) =>
  patchSingleRow({
    path: `/${table}?${buildEqFilterQuery({ id, status: 'processing' })}`,
    payload: { status, ...extra },
    errorStatus: 409,
    errorMessage: `${label} processing state was lost.`,
  });

const revertProcessingRecord = async ({ table, id, extra = {} }) => {
  await patchRows(
    `/${table}?${buildEqFilterQuery({ id, status: 'processing' })}`,
    { status: 'pending', ...extra },
    'return=minimal',
  );
};

const updatePlayerWithExpectedState = async ({ playerId, expected = {}, updates, errorMessage }) =>
  patchSingleRow({
    path: `/players?${buildEqFilterQuery({ id: playerId, ...expected })}`,
    payload: updates,
    errorStatus: 409,
    errorMessage,
  });

const normalizeLiveMember = (member) => ({
  id: String(member?.Id || '').trim(),
  name: sanitizeText(member?.Name || member?.id || '', 120),
});

const fetchPlayersByIds = async (playerIds, select = 'id,name,balance,loot_split') => {
  const normalizedIds = sanitizeIds(playerIds);
  if (normalizedIds.length === 0) return [];

  const filter = normalizedIds
    .map((id) => `id.eq.${encodeURIComponent(id)}`)
    .join(',');

  const response = await supabaseFetch(`/players?select=${select}&or=(${filter})`);
  const rows = await readJson(response);
  return Array.isArray(rows) ? rows : [];
};

const dedupeLiveMembers = (members) => {
  const uniqueMembers = new Map();

  for (const member of Array.isArray(members) ? members : []) {
    const normalizedMember = normalizeLiveMember(member);
    if (!normalizedMember.id) continue;

    const existingMember = uniqueMembers.get(normalizedMember.id);
    if (!existingMember || (!existingMember.name && normalizedMember.name)) {
      uniqueMembers.set(normalizedMember.id, normalizedMember);
    }
  }

  return [...uniqueMembers.values()];
};

const createPlayerPayloadFromMember = (member) => {
  const normalizedMember = normalizeLiveMember(member);

  return {
    id: normalizedMember.id,
    name: normalizedMember.name || normalizedMember.id,
    balance: 0,
    loot_split: 0,
    issued: 0,
    compensations: 0,
    sets: 0,
    trash: 0,
    deposited: 0,
    withdrawn: 0,
    activity: 1,
  };
};

const createManualPlayerPayload = (nickname) => {
  const sanitizedNickname = sanitizeText(nickname, 120);

  return {
    id: `${MANUAL_PLAYER_ID_PREFIX}${crypto.randomUUID()}`,
    name: sanitizedNickname,
    ...getPlayerLedgerState(),
    activity: 1,
  };
};

const createMergedPlayerPayload = (member, existingPlayer = {}) => ({
  ...createPlayerPayloadFromMember(member),
  ...getPlayerLedgerState(existingPlayer),
  activity: 1,
});

const parseRegearAmountsFromContentRow = (row) => {
  if (!row?.title) {
    return buildDefaultRegearAmounts();
  }

  try {
    return normalizeRegearAmounts(JSON.parse(String(row.title)));
  } catch {
    return buildDefaultRegearAmounts();
  }
};

const getRegearConfigRow = async () => {
  const response = await supabaseFetch(
    `/regear_contents?id=eq.${encodeURIComponent(REGEAR_CONFIG_CONTENT_ID)}&select=*`,
  );
  const rows = await readJson(response);
  return Array.isArray(rows) ? rows[0] || null : rows || null;
};

const getRegearAmountsOnServer = async () => {
  const row = await getRegearConfigRow();
  return parseRegearAmountsFromContentRow(row);
};

const saveRegearAmountsOnServer = async (amounts, updatedBy = 'system') => {
  const normalizedAmounts = normalizeRegearAmounts(amounts);
  const payload = {
    id: REGEAR_CONFIG_CONTENT_ID,
    title: JSON.stringify(normalizedAmounts),
    created_by: sanitizeText(updatedBy, 120) || 'system',
    is_active: true,
  };
  const existingRow = await getRegearConfigRow();

  if (existingRow) {
    await supabaseFetch(`/regear_contents?id=eq.${encodeURIComponent(REGEAR_CONFIG_CONTENT_ID)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(payload),
    });
  } else {
    await supabaseFetch('/regear_contents', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(payload),
    });
  }

  return normalizedAmounts;
};

const migratePlayerReferencesOnServer = async ({ oldPlayerId, newPlayerId }) => {
  const fromId = String(oldPlayerId || '').trim();
  const toId = String(newPlayerId || '').trim();

  if (!fromId || !toId || fromId === toId) {
    return {
      updatedRows: 0,
      updatedSplits: 0,
    };
  }

  let updatedRows = 0;

  const directReferenceTables = [
    'discord_links',
    'regear_submissions',
    'withdrawal_requests',
    'shop_orders',
    'battle_pass_unlocks',
  ];

  for (const table of directReferenceTables) {
    const rows = await patchRows(
      `/${table}?player_id=eq.${encodeURIComponent(fromId)}`,
      { player_id: toId },
    );

    updatedRows += Array.isArray(rows)
      ? rows.length
      : rows
        ? 1
        : 0;
  }

  const splitResponse = await supabaseFetch('/pending_splits?select=id,participants,participant_count');
  const splitRows = await readJson(splitResponse);
  const affectedSplits = (Array.isArray(splitRows) ? splitRows : []).filter((split) =>
    sanitizeIds(split?.participants).includes(fromId),
  );

  for (const split of affectedSplits) {
    const nextParticipants = sanitizeIds(split?.participants).map((participant) =>
      participant === fromId ? toId : participant,
    );

    await supabaseFetch(`/pending_splits?id=eq.${encodeURIComponent(split.id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        participants: nextParticipants,
        participant_count: nextParticipants.length,
      }),
    });
  }

  return {
    updatedRows,
    updatedSplits: affectedSplits.length,
  };
};

const addManualPlayerOnServer = async (nickname) => {
  const sanitizedNickname = sanitizeText(nickname, 120);
  if (!sanitizedNickname) {
    throw new HttpError(400, 'Nickname is required.');
  }

  const normalizedName = normalizeNickname(sanitizedNickname);
  const existingRows = await readJson(await supabaseFetch('/players?select=*'));
  const existingPlayers = Array.isArray(existingRows) ? existingRows : [];
  const existingPlayer = existingPlayers.find(
    (player) => normalizeNickname(player?.name) === normalizedName,
  );

  if (existingPlayer) {
    if (Number(existingPlayer.activity) === 1 && String(existingPlayer.name || '') === sanitizedNickname) {
      return {
        mode: 'existing',
        player: existingPlayer,
      };
    }

    const updatedRows = await patchRows(
      `/players?id=eq.${encodeURIComponent(String(existingPlayer.id))}`,
      {
        name: sanitizedNickname,
        activity: 1,
      },
    );
    const updatedPlayer = Array.isArray(updatedRows) ? updatedRows[0] : updatedRows;

    return {
      mode: 'reactivated',
      player: updatedPlayer || { ...existingPlayer, name: sanitizedNickname, activity: 1 },
    };
  }

  const createdResponse = await supabaseFetch('/players', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(createManualPlayerPayload(sanitizedNickname)),
  });
  const createdRows = await readJson(createdResponse);
  const createdPlayer = Array.isArray(createdRows) ? createdRows[0] : createdRows;

  return {
    mode: 'created',
    player: createdPlayer,
  };
};

const fetchAlbionGuildMembers = async (guildIdOverride = '') => {
  const guildId = resolveAlbionGuildId(guildIdOverride);
  if (!guildId) {
    throw new HttpError(500, 'Albion guild id is not configured.');
  }

  const guildMembersUrl = getAlbionGuildMembersUrl(guildId);
  const guildRes = await fetch(guildMembersUrl, {
    headers: { 'User-Agent': APP_USER_AGENT },
  });

  if (!guildRes.ok) {
    throw new HttpError(500, 'Guild API failed.');
  }

  const liveMembers = await guildRes.json();

  return {
    guildId,
    members: dedupeLiveMembers(liveMembers),
  };
};

export const syncGuildRosterOnServer = async ({ guildIdOverride = '', replaceExisting = false } = {}) => {
  const { guildId, members } = await fetchAlbionGuildMembers(guildIdOverride);
  const liveIds = new Set(members.map((member) => member.id));
  const existingPlayers = replaceExisting
    ? []
    : (await readJson(await supabaseFetch('/players?select=*'))) || [];
  const existingById = new Map(existingPlayers.map((player) => [String(player.id), player]));
  const manualPlayersByName = new Map(
    existingPlayers
      .filter((player) => isManualPlayerId(player?.id))
      .map((player) => [normalizeNickname(player?.name), player]),
  );

  const newMembers = [];
  const updatedMembers = [];
  const mergedManualMembers = [];

  for (const member of members) {
    const existingPlayer = existingById.get(member.id);

    if (!existingPlayer) {
      const manualPlayer = manualPlayersByName.get(normalizeNickname(member.name));

      if (manualPlayer) {
        mergedManualMembers.push({
          member,
          manualPlayer,
        });
        manualPlayersByName.delete(normalizeNickname(member.name));
        continue;
      }

      newMembers.push(createPlayerPayloadFromMember(member));
      continue;
    }

    const updates = {};
    if (sanitizeText(existingPlayer.name || '', 120) !== member.name) {
      updates.name = member.name;
    }
    if (Number(existingPlayer.activity) !== 1) {
      updates.activity = 1;
    }

    if (Object.keys(updates).length > 0) {
      updatedMembers.push({
        id: member.id,
        name: member.name,
        updates,
      });
    }
  }

  const leftMembers = replaceExisting
    ? []
    : existingPlayers.filter(
      (player) =>
        !isManualPlayerId(player?.id)
        && !liveIds.has(String(player.id))
        && Number(player.activity) !== 0,
    );

  if (newMembers.length > 0) {
    await supabaseFetch('/players?on_conflict=id', {
      method: 'POST',
      headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
      body: JSON.stringify(newMembers),
    });
  }

  for (const updatedMember of updatedMembers) {
    await supabaseFetch(`/players?id=eq.${encodeURIComponent(updatedMember.id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(updatedMember.updates),
    });
  }

  for (const mergedMember of mergedManualMembers) {
    await supabaseFetch('/players', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(
        createMergedPlayerPayload(mergedMember.member, mergedMember.manualPlayer),
      ),
    });

    await migratePlayerReferencesOnServer({
      oldPlayerId: mergedMember.manualPlayer.id,
      newPlayerId: mergedMember.member.id,
    });

    await deleteRows(`/players?id=eq.${encodeURIComponent(String(mergedMember.manualPlayer.id))}`);
  }

  for (const leftPlayer of leftMembers) {
    await supabaseFetch(`/players?id=eq.${encodeURIComponent(leftPlayer.id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ activity: 0 }),
    });
  }

  return {
    guildId,
    total: members.length,
    added: newMembers.length,
    reactivated: updatedMembers.filter((member) => member.updates.activity === 1).length,
    renamed: updatedMembers.filter((member) => member.updates.name).length,
    mergedManual: mergedManualMembers.length,
    left: leftMembers.length,
    newNames: newMembers.map((member) => member.name),
    updatedNames: updatedMembers.map((member) => member.name),
    mergedNames: mergedManualMembers.map((entry) => entry.member.name),
    leftNames: leftMembers.map((player) => player.name),
  };
};

const resetGuildDataOnServer = async () => {
  const deleteOperations = [
    { label: 'battle_pass_unlocks', path: '/battle_pass_unlocks?id=not.is.null' },
    { label: 'battle_pass_rewards', path: '/battle_pass_rewards?id=not.is.null' },
    { label: 'battle_pass_seasons', path: '/battle_pass_seasons?id=not.is.null' },
    { label: 'shop_orders', path: '/shop_orders?id=not.is.null' },
    { label: 'withdrawal_requests', path: '/withdrawal_requests?id=not.is.null' },
    { label: 'regear_submissions', path: '/regear_submissions?id=not.is.null' },
    { label: 'regear_contents', path: '/regear_contents?id=not.is.null' },
    { label: 'pending_splits', path: '/pending_splits?id=not.is.null' },
    { label: 'discord_links', path: '/discord_links?discord_id=not.is.null' },
    { label: 'players', path: '/players?id=not.is.null' },
  ];

  for (const operation of deleteOperations) {
    await supabaseFetch(operation.path, {
      method: 'DELETE',
      headers: { Prefer: 'return=minimal' },
    });
  }

  return {
    clearedTables: deleteOperations.map((operation) => operation.label),
  };
};

const getLinkedPlayerIdForDiscordUser = async (discordId) => {
  const response = await supabaseFetch(
    `/discord_links?discord_id=eq.${encodeURIComponent(discordId)}&select=*`,
  );
  const rows = await readJson(response);
  return Array.isArray(rows) && rows[0]?.player_id ? String(rows[0].player_id) : null;
};

const fetchDiscordLinksByPlayerIds = async (playerIds) => {
  const normalizedIds = sanitizeIds(playerIds);
  if (normalizedIds.length === 0) return new Map();

  const response = await supabaseFetch('/discord_links?select=discord_id,player_id');
  const rows = await readJson(response);
  const allowedIds = new Set(normalizedIds.map(String));
  const linkMap = new Map();

  for (const row of Array.isArray(rows) ? rows : []) {
    const playerId = String(row?.player_id || '').trim();
    const discordId = String(row?.discord_id || '').trim();

    if (!playerId || !discordId || !allowedIds.has(playerId)) continue;
    if (!linkMap.has(playerId)) {
      linkMap.set(playerId, discordId);
    }
  }

  return linkMap;
};

const getDiscordLabel = ({ discordId, fallbackName }) => {
  const normalizedDiscordId = String(discordId || '').trim();
  if (normalizedDiscordId) {
    return `<@${normalizedDiscordId}>`;
  }

  const fallback = sanitizeText(fallbackName || 'Bilinmiyor', 120);
  return fallback || 'Bilinmiyor';
};

const sendDiscordChannelMessage = async ({
  channelId = DISCORD_APPROVAL_CHANNEL_ID,
  content,
  errorLabel,
  mentionEveryone = false,
}) => {
  if (!DISCORD_BOT_TOKEN || !channelId) {
    return { sent: false, skipped: true };
  }

  const response = await fetch(
    `https://discord.com/api/v10/channels/${encodeURIComponent(channelId)}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: trimDiscordContent(content),
        allowed_mentions: { parse: mentionEveryone ? ['users', 'everyone'] : ['users'] },
      }),
    },
  );

  if (!response.ok) {
    let message = errorLabel || 'Discord notification failed.';

    try {
      const payload = await response.json();
      message = payload?.message || message;
    } catch {
      // Ignore JSON parse failures.
    }

    throw new HttpError(response.status, message);
  }

  return { sent: true };
};

const buildNotificationResult = async (builder) => {
  try {
    const result = await builder();
    return {
      notificationSent: Boolean(result?.sent),
      notificationError: result?.sent ? null : 'Discord notification was skipped.',
    };
  } catch (error) {
    return {
      notificationSent: false,
      notificationError: error.message || 'Discord notification failed.',
    };
  }
};

const sendRegearContentOpenedDiscordNotification = async ({ req, title, createdBy }) => {
  const regearUrl = buildAppTabUrl(req, 'Regear');
  const roleLabels = REGEAR_ROLES.map((role) => role.id).join(', ');

  const content = [
    '@everyone',
    '**Yeni regear contenti acildi**',
    `Content: ${sanitizeText(title, 120)}`,
    createdBy ? `Acan yetkili: ${sanitizeText(createdBy, 120)}` : '',
    '',
    'Yeni regear acildi. Regear gonder ekranina girip rolune gore talebini olustur ve olum screenshotini yukle.',
    roleLabels ? `Roller: ${sanitizeText(roleLabels, 180)}` : '',
    regearUrl ? `Regear Gonder: ${regearUrl}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return sendDiscordChannelMessage({
    channelId: DISCORD_HQ_CHANNEL_ID,
    content,
    errorLabel: 'Discord regear content announcement failed.',
    mentionEveryone: true,
  });
};

const buildSplitAmounts = (split) => {
  const grossTotal = Math.max(0, Math.floor(Number(split?.gross_total ?? split?.grossTotal) || 0));
  const repairFee = Math.max(0, Math.floor(Number(split?.repair_fee ?? split?.repairFee) || 0));
  const afterRepair = Math.max(0, grossTotal - repairFee);
  const marketTax = Math.floor(afterRepair * 0.04);
  const guildShare = Math.floor(Math.max(0, afterRepair - marketTax) * 0.25);
  const netTotal = Math.max(0, Math.floor(Number(split?.net_total ?? split?.netTotal) || 0));
  const perPerson = Math.max(0, Math.floor(Number(split?.per_person ?? split?.perPerson) || 0));

  return {
    grossTotal,
    repairFee,
    marketTax,
    guildShare,
    netTotal,
    perPerson,
  };
};

const sendSplitApprovedDiscordNotification = async ({ split, players }) => {
  const participants = sanitizeIds(split?.participants);
  const discordLinks = await fetchDiscordLinksByPlayerIds(
    participants
      .map((participant) => {
        const player = (Array.isArray(players) ? players : []).find(
          (entry) => entry.id === participant || entry.name === participant,
        );
        return player ? String(player.id) : '';
      })
      .filter(Boolean),
  );

  const participantLines = participants
    .map((participant) => {
      const player = (Array.isArray(players) ? players : []).find(
        (entry) => entry.id === participant || entry.name === participant,
      );
      const fallbackName = player?.name || participant;
      const discordId = player ? discordLinks.get(String(player.id)) : '';
      return `- ${getDiscordLabel({ discordId, fallbackName })}`;
    })
    .filter(Boolean);

  const amounts = buildSplitAmounts(split);
  const title = sanitizeText(split?.split_name || split?.splitName || 'Loot Split', 120);

  const content = [
    '**Loot split onaylandi**',
    `Baslik: ${title}`,
    split?.submitter_id ? `Onaylanan talep: <@${split.submitter_id}>` : '',
    `Toplam loot: ${formatDiscordSilver(amounts.grossTotal)}`,
    `Repair: ${formatDiscordSilver(amounts.repairFee)}`,
    `Market tax: ${formatDiscordSilver(amounts.marketTax)}`,
    `Guild payi: ${formatDiscordSilver(amounts.guildShare)}`,
    `Net toplam: ${formatDiscordSilver(amounts.netTotal)}`,
    `Kisi basi: ${formatDiscordSilver(amounts.perPerson)}`,
    participantLines.length > 0 ? `Katilimcilar:\n${participantLines.join('\n')}` : 'Katilimci listesi yok.',
  ]
    .filter(Boolean)
    .join('\n');

  return sendDiscordChannelMessage({
    content,
    errorLabel: 'Discord loot split notification failed.',
  });
};

const sendRegearApprovedDiscordNotification = async ({ submission, payoutAmount }) => {
  const playerId = submission?.player_id ? String(submission.player_id) : '';
  const discordLinks = await fetchDiscordLinksByPlayerIds(playerId ? [playerId] : []);
  let playerName = '';
  let contentTitle = '';

  if (playerId) {
    const playerResponse = await supabaseFetch(
      `/players?id=eq.${encodeURIComponent(playerId)}&select=id,name`,
    );
    const playerRows = await readJson(playerResponse);
    playerName = Array.isArray(playerRows) ? playerRows[0]?.name || '' : '';
  }

  if (submission?.content_id) {
    const contentResponse = await supabaseFetch(
      `/regear_contents?id=eq.${encodeURIComponent(submission.content_id)}&select=id,title`,
    );
    const contentRows = await readJson(contentResponse);
    contentTitle = Array.isArray(contentRows) ? contentRows[0]?.title || '' : '';
  }

  const recipientLabel = getDiscordLabel({
    discordId: discordLinks.get(playerId) || submission?.submitter_id,
    fallbackName: playerName || submission?.submitter,
  });

  const content = [
    '**Regear onaylandi**',
    contentTitle ? `Content: ${sanitizeText(contentTitle, 120)}` : '',
    `Oyuncu: ${recipientLabel}`,
    playerName ? `Karakter: ${sanitizeText(playerName, 120)}` : '',
    submission?.role ? `Rol: ${sanitizeText(submission.role, 40)}` : '',
    `Odeme: ${formatDiscordSilver(payoutAmount)} Silver`,
  ]
    .filter(Boolean)
    .join('\n');

  return sendDiscordChannelMessage({
    content,
    errorLabel: 'Discord regear notification failed.',
  });
};

const sendWithdrawalApprovedDiscordNotification = async ({ request, amount, player }) => {
  const playerId = request?.player_id ? String(request.player_id) : '';
  const discordLinks = await fetchDiscordLinksByPlayerIds(playerId ? [playerId] : []);
  const recipientLabel = getDiscordLabel({
    discordId: discordLinks.get(playerId) || request?.submitter_id,
    fallbackName: player?.name || request?.submitter,
  });

  const content = [
    '**Para cekme onaylandi**',
    `Oyuncu: ${recipientLabel}`,
    player?.name ? `Karakter: ${sanitizeText(player.name, 120)}` : '',
    `Tutar: ${formatDiscordSilver(amount)} Silver`,
    Number.isFinite(Number(player?.balance))
      ? `Kalan bakiye: ${formatDiscordSilver(player.balance)} Silver`
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  return sendDiscordChannelMessage({
    content,
    errorLabel: 'Discord withdrawal notification failed.',
  });
};

const resolveRegearOnServer = async (submissionId) => {
  const submission = await claimPendingRecord({
    table: 'regear_submissions',
    id: submissionId,
    label: 'Regear submission',
  });

  const regearAmounts = await getRegearAmountsOnServer();
  const normalizedPayout = Math.max(
    0,
    Math.floor(Number(regearAmounts[sanitizeText(submission?.role, 40)] || 0)),
  );

  let previousPlayerState = null;

  try {
    if (submission.player_id && normalizedPayout > 0) {
      const playerRes = await supabaseFetch(
        `/players?id=eq.${encodeURIComponent(submission.player_id)}&select=id,balance,compensations`,
      );
      const playerRows = await readJson(playerRes);
      const player = Array.isArray(playerRows) ? playerRows[0] : null;

      if (!player) {
        throw new HttpError(404, 'Linked player not found for this regear request.');
      }

      previousPlayerState = {
        id: player.id,
        balance: player.balance || 0,
        compensations: player.compensations || 0,
      };

      await updatePlayerWithExpectedState({
        playerId: player.id,
        expected: {
          balance: previousPlayerState.balance,
          compensations: previousPlayerState.compensations,
        },
        updates: {
          balance: previousPlayerState.balance + normalizedPayout,
          compensations: previousPlayerState.compensations + normalizedPayout,
        },
        errorMessage: 'Player balance changed while approving regear. Retry the request.',
      });
    }

    await finalizeProcessedRecord({
      table: 'regear_submissions',
      id: submissionId,
      status: 'approved',
      label: 'Regear submission',
    });
  } catch (error) {
    if (previousPlayerState) {
      await patchRows(
        `/players?${buildEqFilterQuery({
          id: previousPlayerState.id,
          balance: previousPlayerState.balance + normalizedPayout,
          compensations: previousPlayerState.compensations + normalizedPayout,
        })}`,
        {
          balance: previousPlayerState.balance,
          compensations: previousPlayerState.compensations,
        },
        'return=minimal',
      );
    }

    await revertProcessingRecord({ table: 'regear_submissions', id: submissionId });
    throw error;
  }

  const notification = await buildNotificationResult(() =>
    sendRegearApprovedDiscordNotification({
      submission: { ...submission, status: 'approved' },
      payoutAmount: normalizedPayout,
    }));

  return { success: true, payoutAmount: normalizedPayout, ...notification };
};

const resolveSplitOnServer = async (splitId) => {
  const split = await claimPendingRecord({
    table: 'pending_splits',
    id: splitId,
    label: 'Split',
  });

  const participants = sanitizeIds(split.participants);
  const perPerson = split.per_person || 0;
  const appliedUpdates = [];
  let players = [];

  try {
    if (participants.length > 0) {
      players = await fetchPlayersByIds(participants, 'id,name,balance,loot_split');
    }

    if (participants.length > 0 && perPerson > 0) {
      for (const participant of participants) {
        const player = players.find(
          (entry) => entry.id === participant || entry.name === participant,
        );

        if (!player) continue;

        const previousBalance = player.balance || 0;
        const previousLootSplit = player.loot_split || 0;

        appliedUpdates.push({
          id: player.id,
          balance: previousBalance,
          loot_split: previousLootSplit,
        });

        await updatePlayerWithExpectedState({
          playerId: player.id,
          expected: {
            balance: previousBalance,
            loot_split: previousLootSplit,
          },
          updates: {
            balance: previousBalance + perPerson,
            loot_split: previousLootSplit + perPerson,
          },
          errorMessage: 'Player balance changed while approving split. Retry the request.',
        });
      }
    }

    await finalizeProcessedRecord({
      table: 'pending_splits',
      id: splitId,
      status: 'approved',
      label: 'Split',
    });

    await syncBattlePassForApprovedSplit({ ...split, status: 'approved' });
  } catch (error) {
    for (const applied of appliedUpdates.reverse()) {
      await patchRows(
        `/players?${buildEqFilterQuery({
          id: applied.id,
          balance: applied.balance + perPerson,
          loot_split: applied.loot_split + perPerson,
        })}`,
        {
          balance: applied.balance,
          loot_split: applied.loot_split,
        },
        'return=minimal',
      );
    }

    await revertProcessingRecord({ table: 'pending_splits', id: splitId });
    throw error;
  }

  const notification = await buildNotificationResult(() =>
    sendSplitApprovedDiscordNotification({
      split: { ...split, status: 'approved' },
      players,
    }));

  return { success: true, ...notification };
};

const resolveWithdrawalOnServer = async (requestId) => {
  const request = await claimPendingRecord({
    table: 'withdrawal_requests',
    id: requestId,
    label: 'Withdrawal request',
  });

  const amount = Math.max(0, Math.floor(Number(request.amount) || 0));
  if (!amount) {
    throw new HttpError(400, 'Withdrawal amount is invalid.');
  }

  const playerRes = await supabaseFetch(
    `/players?id=eq.${encodeURIComponent(request.player_id)}&select=id,balance,withdrawn`,
  );
  const playerRows = await readJson(playerRes);
  const player = Array.isArray(playerRows) ? playerRows[0] : null;

  if (!player) {
    throw new HttpError(404, 'Linked player not found for this withdrawal request.');
  }

  if ((player.balance || 0) < amount) {
    throw new HttpError(400, 'Player balance is lower than the requested withdrawal.');
  }

  const previousPlayerState = {
    id: player.id,
    balance: player.balance || 0,
    withdrawn: player.withdrawn || 0,
  };

  try {
    await updatePlayerWithExpectedState({
      playerId: player.id,
      expected: {
        balance: previousPlayerState.balance,
        withdrawn: previousPlayerState.withdrawn,
      },
      updates: {
        balance: previousPlayerState.balance - amount,
        withdrawn: previousPlayerState.withdrawn + amount,
      },
      errorMessage: 'Player balance changed while approving withdrawal. Retry the request.',
    });

    await finalizeProcessedRecord({
      table: 'withdrawal_requests',
      id: requestId,
      status: 'approved',
      label: 'Withdrawal request',
      extra: {
        rejection_reason: null,
        resolved_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    await patchRows(
      `/players?${buildEqFilterQuery({
        id: previousPlayerState.id,
        balance: previousPlayerState.balance - amount,
        withdrawn: previousPlayerState.withdrawn + amount,
      })}`,
      {
        balance: previousPlayerState.balance,
        withdrawn: previousPlayerState.withdrawn,
      },
      'return=minimal',
    );
    await revertProcessingRecord({ table: 'withdrawal_requests', id: requestId });
    throw error;
  }

  const updatedPlayer = {
    ...player,
    balance: (player.balance || 0) - amount,
    withdrawn: (player.withdrawn || 0) + amount,
  };

  const notification = await buildNotificationResult(() =>
    sendWithdrawalApprovedDiscordNotification({
      request: { ...request, status: 'approved' },
      amount,
      player: updatedPlayer,
    }));

  return { success: true, amount, ...notification };
};

const transferBalanceOnServer = async ({ discordUserId, recipientPlayerId, amount }) => {
  const linkedPlayerId = await getLinkedPlayerIdForDiscordUser(discordUserId);

  if (!linkedPlayerId) {
    throw new HttpError(400, 'Link your Discord account to your character first.');
  }

  const normalizedRecipientId = String(recipientPlayerId || '').trim();
  if (!normalizedRecipientId) {
    throw new HttpError(400, 'Recipient player id is required.');
  }

  if (normalizedRecipientId === linkedPlayerId) {
    throw new HttpError(400, 'You cannot send balance to your own character.');
  }

  const normalizedAmount = Math.max(0, Math.floor(Number(amount) || 0));
  if (!normalizedAmount) {
    throw new HttpError(400, 'Transfer amount must be greater than zero.');
  }

  const playersResponse = await supabaseFetch(
    `/players?select=id,name,balance&or=(id.eq.${encodeURIComponent(linkedPlayerId)},id.eq.${encodeURIComponent(normalizedRecipientId)})`,
  );
  const playerRows = await readJson(playersResponse);
  const players = Array.isArray(playerRows) ? playerRows : [];

  const sender = players.find((player) => String(player.id) === String(linkedPlayerId)) || null;
  const recipient = players.find((player) => String(player.id) === normalizedRecipientId) || null;

  if (!sender) {
    throw new HttpError(404, 'Linked player not found.');
  }

  if (!recipient) {
    throw new HttpError(404, 'Recipient player not found.');
  }

  if ((sender.balance || 0) < normalizedAmount) {
    throw new HttpError(400, 'Player balance is lower than the requested transfer.');
  }

  const nextSenderBalance = (sender.balance || 0) - normalizedAmount;
  const nextRecipientBalance = (recipient.balance || 0) + normalizedAmount;

  try {
    await updatePlayerWithExpectedState({
      playerId: sender.id,
      expected: { balance: sender.balance || 0 },
      updates: { balance: nextSenderBalance },
      errorMessage: 'Sender balance changed during transfer. Retry the transfer.',
    });

    await updatePlayerWithExpectedState({
      playerId: recipient.id,
      expected: { balance: recipient.balance || 0 },
      updates: { balance: nextRecipientBalance },
      errorMessage: 'Recipient balance changed during transfer. Retry the transfer.',
    });
  } catch (error) {
    await patchRows(
      `/players?${buildEqFilterQuery({
        id: sender.id,
        balance: nextSenderBalance,
      })}`,
      { balance: sender.balance || 0 },
      'return=minimal',
    );
    throw error;
  }

  return {
    success: true,
    amount: normalizedAmount,
    sender: {
      id: sender.id,
      name: sender.name,
      balance: nextSenderBalance,
    },
    recipient: {
      id: recipient.id,
      name: recipient.name,
      balance: nextRecipientBalance,
    },
  };
};

const sendShopDiscordNotification = async ({
  discordId,
  playerName,
  chestLocation,
  pickupNote,
  items,
}) => {
  const orderLines = (Array.isArray(items) ? items : [])
    .map((item) => {
      const quantity = Math.max(1, Math.floor(Number(item?.quantity) || 1));
      const label = item?.label || item?.uniqueName || 'Item';
      const tier = item?.tierLabel ? ` (${item.tierLabel})` : '';
      return `- ${quantity}x ${label}${tier}`;
    })
    .join('\n');

  const recipientLabel = getDiscordLabel({
    discordId,
    fallbackName: playerName || 'Bilinmiyor',
  });

  const content = [
    '**Team Supremacy shop siparisi hazir**',
    `Oyuncu: ${recipientLabel}`,
    playerName ? `Karakter: ${sanitizeText(playerName, 120)}` : '',
    `Teslimat chest'i: ${chestLocation}`,
    `Konum: ${pickupNote}`,
    orderLines ? `Siparis icerigi:\n${orderLines}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return sendDiscordChannelMessage({
    content,
    errorLabel: 'Discord shop notification failed.',
  });
};

const resolveShopOrderOnServer = async ({
  orderId,
  status,
  chestLocation = '',
  pickupNote = '',
  rejectionReason = '',
  resolvedBy = '',
}) => {
  const order = await claimPendingRecord({
    table: 'shop_orders',
    id: orderId,
    label: 'Shop order',
  });

  const resolvedAt = new Date().toISOString();

  if (status === 'approved') {
    const normalizedChestLocation = sanitizeText(chestLocation, 120);
    const normalizedPickupNote = sanitizeText(pickupNote, 240);
    let playerName = '';

    if (order.player_id) {
      const playerResponse = await supabaseFetch(
        `/players?id=eq.${encodeURIComponent(order.player_id)}&select=id,name`,
      );
      const playerRows = await readJson(playerResponse);
      playerName = Array.isArray(playerRows) ? playerRows[0]?.name || '' : '';
    }

    await finalizeProcessedRecord({
      table: 'shop_orders',
      id: orderId,
      status: 'approved',
      label: 'Shop order',
      extra: {
        chest_location: normalizedChestLocation,
        pickup_note: normalizedPickupNote,
        rejection_reason: null,
        resolved_at: resolvedAt,
        resolved_by: resolvedBy,
      },
    });

    let notificationSent = false;
    let notificationError = null;

    try {
      const notification = await sendShopDiscordNotification({
        discordId: order.discord_id,
        playerName,
        chestLocation: normalizedChestLocation,
        pickupNote: normalizedPickupNote,
        items: order.items,
      });
      notificationSent = Boolean(notification?.sent);
      notificationError = notification?.sent ? null : 'Discord notification was skipped.';
    } catch (error) {
      notificationError = error.message || 'Discord notification failed.';
    }

    return {
      success: true,
      notificationSent,
      notificationError,
    };
  }

  await finalizeProcessedRecord({
    table: 'shop_orders',
    id: orderId,
    status: 'rejected',
    label: 'Shop order',
    extra: {
      rejection_reason: sanitizeText(rejectionReason, 240),
      resolved_at: resolvedAt,
      resolved_by: resolvedBy,
    },
  });

  return { success: true };
};

const getPlayerIdFromParticipantValue = (participant, players) => {
  const normalizedParticipant = String(participant || '').trim();
  if (!normalizedParticipant) return null;

  const player = players.find(
    (entry) => entry.id === normalizedParticipant || entry.name === normalizedParticipant,
  );

  return player ? String(player.id) : null;
};

const getActiveBattlePassSeason = async () => {
  const response = await supabaseFetch(
    '/battle_pass_seasons?select=*&is_active=eq.true&order=created_at.desc&limit=1',
  );
  const rows = await readJson(response);
  return Array.isArray(rows) ? rows[0] || null : null;
};

const getBattlePassRewards = async (seasonId) => {
  const response = await supabaseFetch(
    `/battle_pass_rewards?season_id=eq.${encodeURIComponent(seasonId)}&select=*&order=milestone_day.asc`,
  );
  const rows = await readJson(response);
  return (Array.isArray(rows) ? rows : []).map(normalizeBattlePassReward);
};

const getSeasonDateKeyRange = (season) => ({
  startDateKey: getBattlePassDateKey(season?.starts_at),
  endDateKey: getBattlePassDateKey(season?.ends_at),
});

const isDateKeyWithinSeason = (dateKey, season) => {
  if (!dateKey || !season) return false;
  const { startDateKey, endDateKey } = getSeasonDateKeyRange(season);
  return Boolean(startDateKey && endDateKey && dateKey >= startDateKey && dateKey <= endDateKey);
};

const getApprovedSeasonSplits = async (season) => {
  if (!season) return [];

  const response = await supabaseFetch('/pending_splits?select=*&status=eq.approved&order=submitted_at.asc');
  const rows = await readJson(response);

  return (Array.isArray(rows) ? rows : []).filter((split) => {
    if (!isBattlePassEligibleSplit(split)) return false;
    return isDateKeyWithinSeason(getBattlePassDateKey(split.submitted_at || split.submittedAt), season);
  });
};

const buildBattlePassPlayerSummary = ({
  playerId,
  season,
  rewards,
  splits,
  unlocks,
  players,
}) => {
  const activityDates = sortUniqueDateKeys(
    splits
      .filter((split) =>
        sanitizeIds(split.participants).some(
          (participant) =>
            String(getPlayerIdFromParticipantValue(participant, Array.isArray(players) ? players : []))
            === String(playerId),
        ),
      )
      .map((split) => getBattlePassDateKey(split.submitted_at || split.submittedAt)),
  );

  const progress = computeBattlePassProgress(activityDates, season?.skip_allowance);
  const unlockRows = (Array.isArray(unlocks) ? unlocks : [])
    .filter((unlock) => String(unlock.player_id) === String(playerId))
    .sort((left, right) => (left.milestone_day || 0) - (right.milestone_day || 0));

  const unlockByMilestone = new Map(unlockRows.map((unlock) => [Number(unlock.milestone_day) || 0, unlock]));
  const rewardsWithStatus = rewards.map((reward) => {
    const unlock = unlockByMilestone.get(Number(reward.milestone_day) || 0) || null;
    const unlocked = progress.highestDay >= (Number(reward.milestone_day) || 0);
    return {
      ...reward,
      unlock,
      status: unlock?.status || (unlocked ? 'ready' : 'locked'),
    };
  });

  const claimedSilver = unlockRows
    .filter((unlock) => unlock.reward_type === 'silver')
    .reduce((sum, unlock) => sum + (Number(unlock.silver_amount) || 0), 0);

  const manualPending = unlockRows.filter((unlock) =>
    unlock.reward_type !== 'silver' && unlock.status !== 'delivered',
  ).length;

  return {
    playerId: String(playerId),
    currentDay: progress.currentDay,
    highestDay: progress.highestDay,
    totalActivityDays: progress.totalActivityDays,
    skipsLeft: progress.skipsLeft,
    resets: progress.resets,
    lastActivityDate: progress.lastActivityDate,
    activityDates,
    timeline: progress.timeline,
    rewards: rewardsWithStatus,
    unlocks: unlockRows,
    claimedSilver,
    manualPending,
  };
};

const syncBattlePassUnlocksForPlayer = async ({
  playerId,
  season,
  rewards,
  seasonSplits,
  players,
}) => {
  if (!playerId || !season || !Array.isArray(rewards) || rewards.length === 0) {
    return null;
  }

  const unlocksResponse = await supabaseFetch(
    `/battle_pass_unlocks?season_id=eq.${encodeURIComponent(season.id)}&player_id=eq.${encodeURIComponent(playerId)}&select=*`,
  );
  const existingUnlocks = await readJson(unlocksResponse);
  const summary = buildBattlePassPlayerSummary({
    playerId,
    season,
    rewards,
    splits: seasonSplits,
    unlocks: existingUnlocks,
    players,
  });

  const existingByMilestone = new Map(
    (Array.isArray(existingUnlocks) ? existingUnlocks : []).map((unlock) => [Number(unlock.milestone_day) || 0, unlock]),
  );

  const now = new Date().toISOString();
  const newUnlocks = [];
  let silverPayout = 0;

  for (const reward of rewards) {
    const milestone = Number(reward.milestone_day) || 0;
    if (!milestone || milestone > summary.highestDay || existingByMilestone.has(milestone)) continue;

    const isSilverReward = reward.reward_type === 'silver' && (Number(reward.silver_amount) || 0) > 0;
    const unlock = {
      id: crypto.randomUUID(),
      season_id: season.id,
      player_id: String(playerId),
      reward_id: reward.id,
      milestone_day: milestone,
      reward_type: reward.reward_type,
      silver_amount: Number(reward.silver_amount) || 0,
      item_label: reward.item_label || getBattlePassRewardTitle(reward, 'tr'),
      status: isSilverReward ? 'claimed' : 'unlocked',
      unlocked_at: now,
      claimed_at: isSilverReward ? now : null,
      delivered_at: null,
      delivered_by: null,
    };

    newUnlocks.push(unlock);

    if (isSilverReward) {
      silverPayout += Number(reward.silver_amount) || 0;
    }
  }

  if (newUnlocks.length > 0) {
    await supabaseFetch('/battle_pass_unlocks', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(newUnlocks),
    });
  }

  if (silverPayout > 0) {
    const playerResponse = await supabaseFetch(
      `/players?id=eq.${encodeURIComponent(playerId)}&select=id,balance,issued`,
    );
    const playerRows = await readJson(playerResponse);
    const player = Array.isArray(playerRows) ? playerRows[0] : null;

    if (player) {
      await supabaseFetch(`/players?id=eq.${encodeURIComponent(player.id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          balance: (player.balance || 0) + silverPayout,
          issued: (player.issued || 0) + silverPayout,
        }),
      });
    }
  }

  return { ...summary, newUnlocks, silverPayout };
};

const syncBattlePassForApprovedSplit = async (split) => {
  const season = await getActiveBattlePassSeason();
  if (!season) return null;

  if (!isBattlePassEligibleSplit(split)) {
    return null;
  }

  const splitDateKey = getBattlePassDateKey(split.submitted_at || split.submittedAt);
  if (!isDateKeyWithinSeason(splitDateKey, season)) {
    return null;
  }

  const rewards = await getBattlePassRewards(season.id);
  if (rewards.length === 0) {
    return null;
  }

  const playersResponse = await supabaseFetch('/players?select=id,name');
  const players = await readJson(playersResponse);
  const participantIds = [
    ...new Set(
      sanitizeIds(split.participants)
        .map((participant) => getPlayerIdFromParticipantValue(participant, Array.isArray(players) ? players : []))
        .filter(Boolean),
    ),
  ];

  if (participantIds.length === 0) {
    return null;
  }

  const seasonSplits = await getApprovedSeasonSplits(season);

  const synced = [];
  for (const playerId of participantIds) {
    const result = await syncBattlePassUnlocksForPlayer({
      playerId,
      season,
      rewards,
      seasonSplits,
      players,
    });

    if (result) {
      synced.push(result);
    }
  }

  return {
    seasonId: season.id,
    syncedPlayers: synced.length,
  };
};

export default async function handler(req, res) {
  const { table } = req.query;

  try {
    if (table === 'players') {
      if (req.method === 'GET') {
        const auth = await authenticateRequest(req);

        if (isElevatedRole(auth.user.role)) {
          const response = await supabaseFetch('/players?select=*&order=name.asc');
          return res.status(200).json(await readJson(response));
        }

        const rosterResponse = await supabaseFetch(
          `/players?select=${MEMBER_PLAYER_PUBLIC_SELECT}&order=name.asc`,
        );
        const rosterRows = await readJson(rosterResponse);
        const players = Array.isArray(rosterRows) ? rosterRows : [];
        const linkedPlayerId = await getLinkedPlayerIdForDiscordUser(auth.user.id);

        if (!linkedPlayerId) {
          return res.status(200).json(players);
        }

        const privateResponse = await supabaseFetch(
          `/players?id=eq.${encodeURIComponent(linkedPlayerId)}&select=${MEMBER_PLAYER_PRIVATE_SELECT}`,
        );
        const privateRows = await readJson(privateResponse);
        const privatePlayer = Array.isArray(privateRows) ? privateRows[0] : null;

        if (!privatePlayer) {
          return res.status(200).json(players);
        }

        return res.status(200).json(
          players.map((player) =>
            String(player.id) === String(linkedPlayerId)
              ? { ...player, ...privatePlayer }
              : player),
        );
      }

      if (req.method === 'PATCH' || req.method === 'POST') {
        await authenticateRequest(req, getElevatedRoles());

        if (req.method === 'PATCH') {
          const { id, ...updates } = req.body;
          requireBodyValue(id, 'Player id is required.');

          const response = await supabaseFetch(`/players?id=eq.${encodeURIComponent(id)}`, {
            method: 'PATCH',
            headers: { Prefer: 'return=minimal' },
            body: JSON.stringify(updates),
          });

          return res.status(response.status).json({ success: response.ok });
        }

        const response = await supabaseFetch('/players', {
          method: 'POST',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify(req.body),
        });

        return res.status(response.status).json({ success: response.ok });
      }
    }

    if (table === 'discord_links') {
      const auth = await authenticateRequest(req);

      if (req.method === 'GET') {
        const isElevated = getElevatedRoles().includes(auth.user.role);
        const path = isElevated
          ? '/discord_links?select=*'
          : `/discord_links?discord_id=eq.${encodeURIComponent(auth.user.id)}&select=*`;
        const response = await supabaseFetch(path);
        return res.status(200).json(await readJson(response));
      }

      if (req.method === 'POST') {
        requireBodyValue(req.body?.player_id, 'Player id is required.');

        const isElevated = getElevatedRoles().includes(auth.user.role);
        if (!isElevated && req.body?.discord_id && req.body.discord_id !== auth.user.id) {
          throw new HttpError(403, 'Cannot link another Discord account.');
        }

        const requestedPlayerId = String(req.body.player_id).trim();
        const playerResponse = await supabaseFetch(
          `/players?id=eq.${encodeURIComponent(requestedPlayerId)}&select=id,name,activity`,
        );
        const playerRows = await readJson(playerResponse);
        const requestedPlayer = Array.isArray(playerRows) ? playerRows[0] : null;

        if (!requestedPlayer) {
          throw new HttpError(404, 'Player not found.');
        }

        const payload = {
          discord_id: isElevated && req.body?.discord_id ? req.body.discord_id : auth.user.id,
          player_id: requestedPlayerId,
        };

        const existingResponse = await supabaseFetch(
          `/discord_links?select=*&or=(discord_id.eq.${encodeURIComponent(payload.discord_id)},player_id.eq.${encodeURIComponent(payload.player_id)})`,
        );
        const existingPayload = await readJson(existingResponse);
        const existingRows = Array.isArray(existingPayload) ? existingPayload : [];
        const existingDiscordLink = existingRows.find(
          (row) => String(row?.discord_id || '') === payload.discord_id,
        );
        const existingPlayerLink = existingRows.find(
          (row) => String(row?.player_id || '') === payload.player_id,
        );

        if (!isElevated && existingPlayerLink && String(existingPlayerLink.discord_id || '') !== payload.discord_id) {
          throw new HttpError(409, 'This character is already linked to another Discord account.');
        }

        let response;

        if (
          existingPlayerLink
          && String(existingPlayerLink.discord_id || '') !== payload.discord_id
          && existingDiscordLink
          && String(existingDiscordLink.player_id || '') !== payload.player_id
        ) {
          await deleteRows(
            `/discord_links?discord_id=eq.${encodeURIComponent(payload.discord_id)}`,
          );
        }

        if (existingPlayerLink && String(existingPlayerLink.discord_id || '') !== payload.discord_id) {
          response = await supabaseFetch(
            `/discord_links?player_id=eq.${encodeURIComponent(payload.player_id)}`,
            {
              method: 'PATCH',
              headers: { Prefer: 'return=representation' },
              body: JSON.stringify({ discord_id: payload.discord_id }),
            },
          );
        } else if (existingDiscordLink) {
          response = await supabaseFetch(
            `/discord_links?discord_id=eq.${encodeURIComponent(payload.discord_id)}`,
            {
              method: 'PATCH',
              headers: { Prefer: 'return=representation' },
              body: JSON.stringify({ player_id: payload.player_id }),
            },
          );
        } else {
          response = await supabaseFetch('/discord_links', {
            method: 'POST',
            headers: { Prefer: 'return=representation' },
            body: JSON.stringify(payload),
          });
        }

        return res.status(response.status).json(await readJson(response));
      }
    }

    if (table === 'splits') {
      if (req.method === 'GET') {
        const auth = await authenticateRequest(req);

        if (isElevatedRole(auth.user.role)) {
          const response = await supabaseFetch('/pending_splits?select=*&order=submitted_at.desc');
          return res.status(200).json(await readJson(response));
        }

        const linkedPlayerId = await getLinkedPlayerIdForDiscordUser(auth.user.id);
        const select =
          'id,submitter,submitter_id,split_name,net_total,per_person,participant_count,participants,status,submitted_at';
        const orFilters = [
          `submitter_id.eq.${encodeURIComponent(auth.user.id)}`,
        ];

        if (linkedPlayerId) {
          orFilters.push(`participants.cs.{${encodeURIComponent(String(linkedPlayerId))}}`);
        }

        const response = await supabaseFetch(
          `/pending_splits?select=${select}&or=(${orFilters.join(',')})&order=submitted_at.desc`,
        );
        const filteredRows = await readJson(response);

        return res.status(200).json(filteredRows);
      }

      if (req.method === 'POST') {
        const auth = await authenticateRequest(req);
        const participants = sanitizeIds(req.body?.participants);
        requireBodyValue(req.body?.splitName, 'Split name is required.');
        requireBodyValue(req.body?.lootImage, 'Loot image is required.');
        if (participants.length === 0) {
          throw new HttpError(400, 'At least one participant is required.');
        }

        const payload = {
          id: req.body.id,
          submitter: auth.user.global_name || auth.user.username,
          submitter_id: auth.user.id,
          role: auth.user.role,
          split_name: req.body.splitName,
          loot_image: req.body.lootImage,
          gross_total: req.body.grossTotal,
          repair_fee: req.body.repairFee,
          net_total: req.body.netTotal,
          per_person: req.body.perPerson,
          participant_count: participants.length,
          participants,
          status: 'pending',
        };

        const response = await supabaseFetch('/pending_splits', {
          method: 'POST',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify(payload),
        });

        const created = await readJson(response);
        return res.status(response.status).json(Array.isArray(created) ? created[0] : created);
      }

      if (req.method === 'PATCH') {
        await authenticateRequest(req, getElevatedRoles());
        requireBodyValue(req.body?.id, 'Split id is required.');
        requireBodyValue(req.body?.resolution, 'Resolution is required.');

        if (req.body.resolution === 'approve' || req.body.resolution === 'approved') {
          return res.status(200).json(await resolveSplitOnServer(req.body.id));
        }

        await patchSingleRow({
          path: `/pending_splits?${buildEqFilterQuery({ id: req.body.id, status: 'pending' })}`,
          payload: { status: 'rejected' },
          errorStatus: 409,
          errorMessage: 'Split is already being processed or resolved.',
        });

        return res.status(200).json({ success: true });
      }
    }

    if (table === 'sync') {
      await authenticateRequest(req, getElevatedRoles());
      return res.status(200).json(
        await syncGuildRosterOnServer({ guildIdOverride: req.query?.guildId }),
      );
    }

    if (table === 'system') {
      await authenticateRequest(req, [ROLES.ADMIN]);

      if (req.method === 'GET') {
        return res.status(200).json({
          siteName: SITE_NAME,
          guildName: GUILD_NAME,
          shopName: SHOP_NAME,
          battlePassName: BATTLE_PASS_NAME,
          albionGuildId: ALBION_GUILD_ID,
        });
      }

      if (req.method === 'POST') {
        requireBodyValue(req.body?.action, 'Action is required.');

        if (req.body.action === 'sync_guild') {
          return res.status(200).json(
            await syncGuildRosterOnServer({ guildIdOverride: req.body?.guildId }),
          );
        }

        if (req.body.action === 'add_manual_player') {
          requireBodyValue(req.body?.nickname, 'Nickname is required.');
          return res.status(200).json(await addManualPlayerOnServer(req.body.nickname));
        }

        if (req.body.action === 'reset_and_sync_guild') {
          requireBodyValue(req.body?.confirmation, 'Confirmation text is required.');

          if (String(req.body.confirmation).trim() !== RESET_CONFIRMATION_TEXT) {
            throw new HttpError(400, `Confirmation text must be ${RESET_CONFIRMATION_TEXT}.`);
          }

          const resetSummary = await resetGuildDataOnServer();
          const syncSummary = await syncGuildRosterOnServer({
            guildIdOverride: req.body?.guildId,
            replaceExisting: true,
          });

          return res.status(200).json({
            ...syncSummary,
            reset: resetSummary,
          });
        }
      }
    }

    if (table === 'regear_config') {
      const auth = await authenticateRequest(req);

      if (req.method === 'GET') {
        return res.status(200).json({
          amounts: await getRegearAmountsOnServer(),
        });
      }

      if (req.method === 'PATCH') {
        if (!isElevatedRole(auth.user.role)) {
          throw new HttpError(403, 'Only chiefs and admins can update regear amounts.');
        }

        return res.status(200).json({
          success: true,
          amounts: await saveRegearAmountsOnServer(
            req.body?.amounts,
            auth.user.global_name || auth.user.username,
          ),
        });
      }
    }

    if (table === 'regear_contents') {
      if (req.method === 'GET') {
        await authenticateRequest(req);
        const response = await supabaseFetch(
          '/regear_contents?select=*&order=created_at.desc&is_active=eq.true',
        );
        const rows = await readJson(response);
        const contents = (Array.isArray(rows) ? rows : []).filter(
          (entry) => String(entry?.id || '') !== REGEAR_CONFIG_CONTENT_ID,
        );
        return res.status(200).json(contents);
      }

      if (req.method === 'POST') {
        await authenticateRequest(req, getElevatedRoles());
        requireBodyValue(req.body?.title, 'Content title is required.');

        const payload = {
          id: req.body.id,
          title: req.body.title,
          created_by: req.body.created_by,
        };

        const response = await supabaseFetch('/regear_contents', {
          method: 'POST',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify(payload),
        });

        const created = await readJson(response);
        const createdRow = Array.isArray(created) ? created[0] : created;
        const notification = await buildNotificationResult(() =>
          sendRegearContentOpenedDiscordNotification({
            req,
            title: createdRow?.title || payload.title,
            createdBy: createdRow?.created_by || payload.created_by,
          }));

        return res.status(response.status).json({
          ...createdRow,
          ...notification,
        });
      }

      if (req.method === 'DELETE') {
        await authenticateRequest(req, getElevatedRoles());
        requireBodyValue(req.body?.id, 'Content id is required.');

        const response = await supabaseFetch(
          `/regear_contents?id=eq.${encodeURIComponent(req.body.id)}`,
          {
            method: 'PATCH',
            headers: { Prefer: 'return=minimal' },
            body: JSON.stringify({ is_active: false }),
          },
        );

        return res.status(response.status).json({ success: response.ok });
      }
    }

    if (table === 'regear_submissions') {
      const auth = await authenticateRequest(req);

      if (req.method === 'GET') {
        const isElevated = getElevatedRoles().includes(auth.user.role);
        const filter = isElevated
          ? ''
          : `&submitter_id=eq.${encodeURIComponent(auth.user.id)}`;
        const response = await supabaseFetch(
          `/regear_submissions?select=*,regear_contents(title)&order=submitted_at.desc${filter}`,
        );
        return res.status(200).json(await readJson(response));
      }

      if (req.method === 'POST') {
        requireBodyValue(req.body?.content_id, 'Regear content is required.');
        requireBodyValue(req.body?.role, 'Role is required.');
        requireBodyValue(req.body?.screenshot, 'Screenshot is required.');
        const linkedPlayerId = await getLinkedPlayerIdForDiscordUser(auth.user.id);
        const requestedPlayerId = req.body?.player_id ? String(req.body.player_id) : null;
        const effectivePlayerId = requestedPlayerId || linkedPlayerId || null;
        const normalizedRole = sanitizeText(req.body.role, 40);

        if (requestedPlayerId && linkedPlayerId && requestedPlayerId !== linkedPlayerId) {
          throw new HttpError(403, 'You can only submit regear for your linked character.');
        }

        const duplicateResponse = await supabaseFetch(
          `/regear_submissions?select=id,player_id,screenshot&submitter_id=eq.${encodeURIComponent(auth.user.id)}&content_id=eq.${encodeURIComponent(req.body.content_id)}&role=eq.${encodeURIComponent(normalizedRole)}&status=eq.pending`,
        );
        const duplicateRows = await readJson(duplicateResponse);
        const duplicateSubmission = (Array.isArray(duplicateRows) ? duplicateRows : []).find((entry) =>
          String(entry?.player_id || '') === String(effectivePlayerId || ''),
        );

        if (duplicateSubmission) {
          throw new HttpError(
            409,
            'Bu content ve rol icin zaten bekleyen bir regear talebin var. Once mevcut talebin sonuclansin.',
          );
        }

        const payload = {
          id: req.body.id,
          content_id: req.body.content_id,
          submitter: auth.user.global_name || auth.user.username,
          submitter_id: auth.user.id,
          player_id: effectivePlayerId,
          role: normalizedRole,
          screenshot: req.body.screenshot,
          status: 'pending',
        };

        const response = await supabaseFetch('/regear_submissions', {
          method: 'POST',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify(payload),
        });

        const created = await readJson(response);
        return res.status(response.status).json(Array.isArray(created) ? created[0] : created);
      }

      if (req.method === 'PATCH') {
        await authenticateRequest(req, getElevatedRoles());
        requireBodyValue(req.body?.id, 'Submission id is required.');
        requireBodyValue(req.body?.status, 'Status is required.');

        if (req.body.status === 'approved') {
          return res.status(200).json(await resolveRegearOnServer(req.body.id));
        }

        await patchSingleRow({
          path: `/regear_submissions?${buildEqFilterQuery({ id: req.body.id, status: 'pending' })}`,
          payload: { status: req.body.status },
          errorStatus: 409,
          errorMessage: 'Regear submission is already being processed or resolved.',
        });

        return res.status(200).json({ success: true });
      }
    }

    if (table === 'balance_transfer') {
      const auth = await authenticateRequest(req);

      if (req.method === 'POST') {
        requireBodyValue(req.body?.recipient_player_id, 'Recipient player id is required.');
        requireBodyValue(req.body?.amount, 'Transfer amount is required.');

        return res.status(200).json(
          await transferBalanceOnServer({
            discordUserId: auth.user.id,
            recipientPlayerId: req.body.recipient_player_id,
            amount: req.body.amount,
          }),
        );
      }
    }

    if (table === 'withdrawal_requests') {
      const auth = await authenticateRequest(req);

      if (req.method === 'GET') {
        const isElevated = getElevatedRoles().includes(auth.user.role);
        const filter = isElevated
          ? ''
          : `&submitter_id=eq.${encodeURIComponent(auth.user.id)}`;
        const response = await supabaseFetch(
          `/withdrawal_requests?select=*&order=submitted_at.desc${filter}`,
        );
        return res.status(200).json(await readJson(response));
      }

      if (req.method === 'POST') {
        requireBodyValue(req.body?.player_id, 'Player id is required.');
        requireBodyValue(req.body?.amount, 'Withdrawal amount is required.');
        const linkedPlayerId = await getLinkedPlayerIdForDiscordUser(auth.user.id);
        const requestedPlayerId = String(req.body.player_id);

        if (!linkedPlayerId) {
          throw new HttpError(400, 'Link your Discord account to your character first.');
        }

        if (requestedPlayerId !== linkedPlayerId) {
          throw new HttpError(403, 'You can only create a withdrawal request for your linked character.');
        }

        const amount = Math.max(0, Math.floor(Number(req.body.amount) || 0));
        if (!amount) {
          throw new HttpError(400, 'Withdrawal amount must be greater than zero.');
        }

        const payload = {
          id: req.body.id,
          submitter: auth.user.global_name || auth.user.username,
          submitter_id: auth.user.id,
          player_id: linkedPlayerId,
          amount,
          status: 'pending',
        };

        const response = await supabaseFetch('/withdrawal_requests', {
          method: 'POST',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify(payload),
        });

        const created = await readJson(response);
        return res.status(response.status).json(Array.isArray(created) ? created[0] : created);
      }

      if (req.method === 'PATCH') {
        await authenticateRequest(req, [ROLES.ADMIN]);
        requireBodyValue(req.body?.id, 'Withdrawal request id is required.');
        requireBodyValue(req.body?.status, 'Status is required.');

        if (req.body.status === 'approved') {
          return res.status(200).json(await resolveWithdrawalOnServer(req.body.id));
        }

        if (req.body.status === 'rejected') {
          requireBodyValue(req.body?.rejectionReason, 'Rejection reason is required.');

          await patchSingleRow({
            path: `/withdrawal_requests?${buildEqFilterQuery({ id: req.body.id, status: 'pending' })}`,
            payload: {
              status: 'rejected',
              rejection_reason: req.body.rejectionReason,
              resolved_at: new Date().toISOString(),
            },
            errorStatus: 409,
            errorMessage: 'Withdrawal request is already being processed or resolved.',
          });

          return res.status(200).json({ success: true });
        }
      }
    }

    if (table === 'shop_orders') {
      const auth = await authenticateRequest(req);

      if (req.method === 'GET') {
        const isElevated = getElevatedRoles().includes(auth.user.role);
        const filter = isElevated
          ? ''
          : `&submitter_id=eq.${encodeURIComponent(auth.user.id)}`;
        const response = await supabaseFetch(
          `/shop_orders?select=*&order=created_at.desc${filter}`,
        );
        return res.status(200).json(await readJson(response));
      }

      if (req.method === 'POST') {
        requireBodyValue(req.body?.player_id, 'Player id is required.');
        if (!Array.isArray(req.body?.items) || req.body.items.length === 0) {
          throw new HttpError(400, 'At least one item is required.');
        }
        if (req.body.items.length > SHOP_ORDER_MAX_ITEMS) {
          throw new HttpError(400, `A single order can contain at most ${SHOP_ORDER_MAX_ITEMS} line items.`);
        }

        const linkedPlayerId = await getLinkedPlayerIdForDiscordUser(auth.user.id);
        const requestedPlayerId = String(req.body.player_id);

        if (!linkedPlayerId) {
          throw new HttpError(400, 'Link your Discord account to your character first.');
        }

        if (requestedPlayerId !== linkedPlayerId) {
          throw new HttpError(403, 'You can only create a shop order for your linked character.');
        }

        const items = req.body.items
          .map((item) => ({
            uniqueName: String(item?.uniqueName || '').trim(),
            label: sanitizeText(item?.label || item?.uniqueName || '', 120),
            tierLabel: sanitizeText(item?.tierLabel || '', 16),
            enchantLabel: sanitizeText(item?.enchantLabel || '', 16),
            iconUrl: sanitizeText(item?.iconUrl || '', 240),
            quantity: Math.max(1, Math.min(SHOP_ORDER_MAX_QUANTITY, Math.floor(Number(item?.quantity) || 1))),
          }))
          .filter((item) => /^T\d+_[A-Z0-9_]+(?:@\d+)?$/i.test(item.uniqueName));

        if (items.length === 0) {
          throw new HttpError(400, 'At least one valid item is required.');
        }

        const payload = {
          id: req.body.id,
          submitter: auth.user.global_name || auth.user.username,
          submitter_id: auth.user.id,
          discord_id: auth.user.id,
          player_id: linkedPlayerId,
          items,
          status: 'pending',
        };

        const response = await supabaseFetch('/shop_orders', {
          method: 'POST',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify(payload),
        });

        const created = await readJson(response);
        return res.status(response.status).json(Array.isArray(created) ? created[0] : created);
      }

      if (req.method === 'PATCH') {
        const auth = await authenticateRequest(req, getElevatedRoles());
        requireBodyValue(req.body?.id, 'Order id is required.');
        requireBodyValue(req.body?.status, 'Status is required.');

        if (req.body.status === 'approved') {
          requireBodyValue(req.body?.chestLocation, 'Chest location is required.');
          requireBodyValue(req.body?.pickupNote, 'Pickup note is required.');

          return res.status(200).json(
            await resolveShopOrderOnServer({
              orderId: req.body.id,
              status: 'approved',
              chestLocation: req.body.chestLocation,
              pickupNote: req.body.pickupNote,
              resolvedBy: auth.user.global_name || auth.user.username,
            }),
          );
        }

        if (req.body.status === 'rejected') {
          requireBodyValue(req.body?.rejectionReason, 'Rejection reason is required.');

          return res.status(200).json(
            await resolveShopOrderOnServer({
              orderId: req.body.id,
              status: 'rejected',
              rejectionReason: req.body.rejectionReason,
              resolvedBy: auth.user.global_name || auth.user.username,
            }),
          );
        }
      }
    }

    if (table === 'battle_pass') {
      const auth = await authenticateRequest(req);
      const season = await getActiveBattlePassSeason();

      if (!season) {
        return res.status(200).json({
          season: null,
          rewards: [],
          playerSummary: null,
          playerUnlocks: [],
          leaderboard: [],
          admin: null,
        });
      }

      const [rewards, seasonSplits, playersResponse] = await Promise.all([
        getBattlePassRewards(season.id),
        getApprovedSeasonSplits(season),
        supabaseFetch('/players?select=id,name,activity&order=name.asc'),
      ]);
      const players = await readJson(playersResponse);

      const linkResponse = await supabaseFetch(
        `/discord_links?discord_id=eq.${encodeURIComponent(auth.user.id)}&select=*`,
      );
      const linkRows = await readJson(linkResponse);
      const linkedPlayerId = Array.isArray(linkRows) && linkRows[0]?.player_id
        ? String(linkRows[0].player_id)
        : null;

      let playerSummary = null;
      let playerUnlocks = [];

      if (linkedPlayerId) {
        const unlocksResponse = await supabaseFetch(
          `/battle_pass_unlocks?season_id=eq.${encodeURIComponent(season.id)}&player_id=eq.${encodeURIComponent(linkedPlayerId)}&select=*&order=milestone_day.asc`,
        );
        playerUnlocks = await readJson(unlocksResponse);
        playerSummary = buildBattlePassPlayerSummary({
          playerId: linkedPlayerId,
          season,
          rewards,
          splits: seasonSplits,
          unlocks: playerUnlocks,
          players,
        });
      }

      const isElevated = getElevatedRoles().includes(auth.user.role);

      if (!isElevated) {
        return res.status(200).json({
          season,
          rewards,
          playerSummary,
          playerUnlocks,
          leaderboard: [],
          admin: null,
        });
      }

      const [freshPlayersResponse, unlocksResponse] = await Promise.all([
        supabaseFetch('/players?select=id,name,activity&order=name.asc'),
        supabaseFetch(`/battle_pass_unlocks?season_id=eq.${encodeURIComponent(season.id)}&select=*`),
      ]);

      const adminPlayers = await readJson(freshPlayersResponse);
      const allUnlocks = await readJson(unlocksResponse);
      const playerSummaries = (Array.isArray(adminPlayers) ? adminPlayers : []).map((player) => {
        const summary = buildBattlePassPlayerSummary({
          playerId: player.id,
          season,
          rewards,
          splits: seasonSplits,
          unlocks: allUnlocks,
          players: adminPlayers,
        });

        return {
          ...summary,
          playerName: player.name,
          isActive: player.activity !== 0,
        };
      });

      const leaderboard = [...playerSummaries]
        .sort((left, right) =>
          right.highestDay - left.highestDay
          || right.totalActivityDays - left.totalActivityDays
          || String(left.playerName || '').localeCompare(String(right.playerName || '')))
        .slice(0, 10);

      const manualQueue = (Array.isArray(allUnlocks) ? allUnlocks : [])
        .filter((unlock) => unlock.reward_type !== 'silver' && unlock.status !== 'delivered')
        .map((unlock) => {
          const player = (Array.isArray(adminPlayers) ? adminPlayers : []).find(
            (entry) => String(entry.id) === String(unlock.player_id),
          );

          return {
            ...unlock,
            player_name: player?.name || 'Bilinmiyor',
          };
        })
        .sort((left, right) => (left.milestone_day || 0) - (right.milestone_day || 0));

      const totalClaimedSilver = (Array.isArray(allUnlocks) ? allUnlocks : [])
        .filter((unlock) => unlock.reward_type === 'silver')
        .reduce((sum, unlock) => sum + (Number(unlock.silver_amount) || 0), 0);

      return res.status(200).json({
        season,
        rewards,
        playerSummary,
        playerUnlocks,
        leaderboard,
        admin: {
          eligibleSplitCount: seasonSplits.length,
          activeParticipantCount: playerSummaries.filter((summary) => summary.highestDay > 0).length,
          manualQueue,
          playerSummaries,
          totalClaimedSilver,
        },
      });
    }

    if (table === 'battle_pass_admin') {
      const auth = await authenticateRequest(req, getElevatedRoles());

      if (req.method === 'POST') {
        const action = req.body?.action || 'start_season';

        if (action === 'start_season') {
          const startsAt = req.body?.startsAt || new Date().toISOString();
          const durationDays = Math.max(1, Math.floor(Number(req.body?.durationDays) || DEFAULT_BATTLE_PASS_DURATION_DAYS));
          const skipAllowance = Math.max(0, Math.floor(Number(req.body?.skipAllowance) || DEFAULT_BATTLE_PASS_SKIP_ALLOWANCE));
          const seasonName = String(req.body?.name || BATTLE_PASS_NAME).trim();
          const rewards = Array.isArray(req.body?.rewards) && req.body.rewards.length > 0
            ? req.body.rewards.map(normalizeBattlePassReward)
            : DEFAULT_BATTLE_PASS_REWARDS.map(normalizeBattlePassReward);

          await supabaseFetch('/battle_pass_seasons?is_active=eq.true', {
            method: 'PATCH',
            headers: { Prefer: 'return=minimal' },
            body: JSON.stringify({ is_active: false }),
          });

          const seasonId = crypto.randomUUID();
          const startDate = new Date(startsAt);
          const endDate = new Date(startDate);
          endDate.setUTCDate(endDate.getUTCDate() + durationDays - 1);

          const seasonResponse = await supabaseFetch('/battle_pass_seasons', {
            method: 'POST',
            headers: { Prefer: 'return=representation' },
            body: JSON.stringify({
              id: seasonId,
              name: seasonName,
              starts_at: startDate.toISOString(),
              ends_at: endDate.toISOString(),
              duration_days: durationDays,
              skip_allowance: skipAllowance,
              is_active: true,
              created_by: auth.user.id,
            }),
          });

          const createdSeasonRows = await readJson(seasonResponse);
          const createdSeason = Array.isArray(createdSeasonRows) ? createdSeasonRows[0] : createdSeasonRows;

          const rewardPayload = rewards.map((reward) => ({
            id: crypto.randomUUID(),
            season_id: seasonId,
            milestone_day: Number(reward.milestone_day) || 0,
            reward_type: reward.reward_type || 'item',
            silver_amount: Number(reward.silver_amount) || 0,
            item_label: reward.item_label || getBattlePassRewardTitle(reward, 'tr'),
            is_manual: reward.reward_type === 'silver' ? false : Boolean(reward.is_manual ?? true),
          }));

          if (rewardPayload.length > 0) {
            await supabaseFetch('/battle_pass_rewards', {
              method: 'POST',
              headers: { Prefer: 'return=minimal' },
              body: JSON.stringify(rewardPayload),
            });
          }

          return res.status(200).json({
            season: createdSeason,
            rewards: rewardPayload,
          });
        }
      }

      if (req.method === 'PATCH') {
        requireBodyValue(req.body?.action, 'Action is required.');

        if (req.body.action === 'save_rewards') {
          requireBodyValue(req.body?.seasonId, 'Season id is required.');
          if (!Array.isArray(req.body?.rewards)) {
            throw new HttpError(400, 'Rewards payload must be an array.');
          }

          for (const reward of req.body.rewards) {
            requireBodyValue(reward?.id, 'Reward id is required.');
            await supabaseFetch(`/battle_pass_rewards?id=eq.${encodeURIComponent(reward.id)}`, {
              method: 'PATCH',
              headers: { Prefer: 'return=minimal' },
              body: JSON.stringify({
                milestone_day: Number(reward.milestone_day) || 0,
                reward_type: reward.reward_type || 'item',
                silver_amount: Number(reward.silver_amount) || 0,
                item_label: reward.item_label || getBattlePassRewardTitle(reward, 'tr'),
                is_manual: reward.reward_type === 'silver' ? false : Boolean(reward.is_manual ?? true),
              }),
            });
          }

          return res.status(200).json({ success: true });
        }

        if (req.body.action === 'deliver_reward') {
          requireBodyValue(req.body?.unlockId, 'Unlock id is required.');

          const response = await supabaseFetch(
            `/battle_pass_unlocks?id=eq.${encodeURIComponent(req.body.unlockId)}`,
            {
              method: 'PATCH',
              headers: { Prefer: 'return=minimal' },
              body: JSON.stringify({
                status: 'delivered',
                delivered_at: new Date().toISOString(),
                delivered_by: auth.user.global_name || auth.user.username,
              }),
            },
          );

          return res.status(response.status).json({ success: response.ok });
        }
      }
    }

    return res.status(400).json({ error: 'Invalid table.' });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    return res.status(status).json({ error: error.message || 'Unexpected API error.' });
  }
}
