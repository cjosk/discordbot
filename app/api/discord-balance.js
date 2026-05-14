import { HttpError } from './_error.js';

const ADMIN_DISCORD_ID = '140870990816083968';

const normalizeSupabaseUrl = (value) => {
  const trimmed = String(value || '').trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  return trimmed.endsWith('/rest/v1') ? trimmed : `${trimmed}/rest/v1`;
};

const SUPABASE_URL = normalizeSupabaseUrl(process.env.SUPABASE_URL || '');
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const baseHeaders = {
  apikey: SUPABASE_SERVICE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  'Content-Type': 'application/json',
};

const formatSilver = (value) =>
  new Intl.NumberFormat('en-US').format(Math.floor(Number(value) || 0));

const readJson = async (response) => {
  if (response.status === 204) return null;
  return response.json();
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
      // Ignore non-JSON error bodies.
    }

    throw new HttpError(response.status, message);
  }

  return response;
};

const parseBody = (body) => {
  if (!body) return {};
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }

  if (typeof body === 'object') {
    return body;
  }

  return {};
};

const resolveMode = (req) => {
  const body = parseBody(req.body);
  return String(req.query?.mode || body.mode || 'balance').trim().toLowerCase();
};

const resolveDiscordId = (req) => {
  const body = parseBody(req.body);
  return String(
    req.query?.discordId
      || req.query?.userId
      || body.discordId
      || body.userId
      || body.discord_id
      || '',
  ).trim();
};

const resolveTargetDiscordId = (req) => {
  const body = parseBody(req.body);
  return String(
    req.query?.targetDiscordId
      || body.targetDiscordId
      || body.target_discord_id
      || '',
  ).trim();
};

const resolveActorDiscordId = (req) => {
  const body = parseBody(req.body);
  return String(
    req.query?.actorDiscordId
      || body.actorDiscordId
      || body.actor_discord_id
      || '',
  ).trim();
};

const resolveAmount = (req) => {
  const body = parseBody(req.body);
  return Math.max(0, Math.floor(Number(req.query?.amount || body.amount) || 0));
};

const getLinkedPlayerIdForDiscordUser = async (discordId) => {
  const response = await supabaseFetch(
    `/discord_links?discord_id=eq.${encodeURIComponent(discordId)}&select=player_id&limit=1`,
  );
  const rows = await readJson(response);
  return Array.isArray(rows) && rows[0]?.player_id ? String(rows[0].player_id) : '';
};

const getPlayerBalance = async (playerId) => {
  const response = await supabaseFetch(
    `/players?id=eq.${encodeURIComponent(playerId)}&select=id,name,balance&limit=1`,
  );
  const rows = await readJson(response);
  const player = Array.isArray(rows) ? rows[0] || null : rows || null;

  if (!player) {
    throw new HttpError(404, 'Linked player not found.');
  }

  return {
    id: String(player.id || ''),
    name: String(player.name || '').trim() || 'Unknown',
    balance: Number(player.balance) || 0,
    withdrawn: Number(player.withdrawn) || 0,
  };
};

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

const patchSingleRow = async ({ path, payload, errorStatus = 409, errorMessage }) => {
  const rows = await patchRows(path, payload);
  const row = Array.isArray(rows) ? rows[0] : rows;

  if (!row) {
    throw new HttpError(errorStatus, errorMessage || 'Conditional update failed.');
  }

  return row;
};

const updatePlayerWithExpectedState = async ({ playerId, expected = {}, updates, errorMessage }) =>
  patchSingleRow({
    path: `/players?${buildEqFilterQuery({ id: playerId, ...expected })}`,
    payload: updates,
    errorStatus: 409,
    errorMessage,
  });

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET' && req.method !== 'POST') {
      throw new HttpError(405, 'Method not allowed.');
    }

    res.setHeader('Cache-Control', 'no-store');

    const mode = resolveMode(req);
    const discordId = resolveDiscordId(req);

    if (mode === 'topbalances') {
      const limit = Math.min(Math.max(Number(req.query?.limit) || 5, 1), 10);
      const response = await supabaseFetch(
        `/players?select=id,name,balance&order=balance.desc&limit=${limit}`,
      );
      const rows = await readJson(response);
      const players = (Array.isArray(rows) ? rows : []).map((entry, index) => ({
        rank: index + 1,
        id: String(entry?.id || ''),
        name: String(entry?.name || '').trim() || `Oyuncu ${index + 1}`,
        balance: Number(entry?.balance) || 0,
        balanceFormatted: formatSilver(entry?.balance),
      }));

      return res.status(200).json({
        success: true,
        players,
        message: players.length > 0 ? 'En yuksek bakiyeler hazir.' : 'Gosterilecek bakiye bulunamadi.',
      });
    }

    if (mode === 'adminwithdraw') {
      const actorDiscordId = resolveActorDiscordId(req);
      const targetDiscordId = resolveTargetDiscordId(req);
      const amount = resolveAmount(req);

      if (actorDiscordId !== ADMIN_DISCORD_ID) {
        return res.status(200).json({
          success: false,
          message: 'Bu komutu kullanma yetkin yok.',
          error: 'Unauthorized actor.',
        });
      }

      if (!targetDiscordId) {
        return res.status(200).json({
          success: false,
          message: 'Hedef Discord kullanicisi eksik.',
          error: 'targetDiscordId is required.',
        });
      }

      if (!amount) {
        return res.status(200).json({
          success: false,
          message: 'Gecerli bir tutar girmen gerekiyor.',
          error: 'amount is required.',
        });
      }

      const targetPlayerId = await getLinkedPlayerIdForDiscordUser(targetDiscordId);
      if (!targetPlayerId) {
        return res.status(200).json({
          success: false,
          message: 'Bu Discord kullanicisinin siteye bagli bir karakteri yok.',
          error: 'Linked player not found.',
        });
      }

      const player = await getPlayerBalance(targetPlayerId);
      if (player.balance < amount) {
        return res.status(200).json({
          success: false,
          message: `${player.name} icin yeterli bakiye yok. Mevcut bakiye: ${formatSilver(player.balance)} Silver.`,
          error: 'Insufficient balance.',
        });
      }

      const updatedPlayer = await updatePlayerWithExpectedState({
        playerId: player.id,
        expected: {
          balance: player.balance,
          withdrawn: player.withdrawn || 0,
        },
        updates: {
          balance: player.balance - amount,
          withdrawn: (player.withdrawn || 0) + amount,
        },
        errorMessage: 'Player balance changed while processing admin withdrawal. Retry the command.',
      });

      return res.status(200).json({
        success: true,
        playerId: String(updatedPlayer.id || player.id),
        playerName: String(updatedPlayer.name || player.name || '').trim() || 'Bilinmiyor',
        amount,
        amountFormatted: formatSilver(amount),
        balance: Number(updatedPlayer.balance) || player.balance - amount,
        balanceFormatted: formatSilver(updatedPlayer.balance),
        message: `${player.name} karakterinden ${formatSilver(amount)} Silver dusuldu. Yeni bakiye: ${formatSilver(updatedPlayer.balance)} Silver.`,
      });
    }

    if (!discordId) {
      return res.status(200).json({
        success: false,
        message: 'discordId eksik. Komut baglamini kontrol et.',
        error: 'discordId is required.',
      });
    }

    const linkedPlayerId = await getLinkedPlayerIdForDiscordUser(discordId);
    if (!linkedPlayerId) {
      return res.status(200).json({
        success: true,
        discordId,
        playerId: '',
        playerName: '',
        balance: 0,
        balanceFormatted: '0',
        linked: false,
        pendingCount: 0,
        submissions: [],
        message: 'Discord hesabin sitede bir karaktere bagli degil. Once siteden hesabini bagla.',
      });
    }

    if (mode === 'regear') {
      const response = await supabaseFetch(
        `/regear_submissions?player_id=eq.${encodeURIComponent(linkedPlayerId)}&status=eq.pending&select=id,role,submitted_at,regear_contents(title)&order=submitted_at.desc&limit=5`,
      );
      const rows = await readJson(response);
      const submissions = (Array.isArray(rows) ? rows : []).map((row) => ({
        id: String(row?.id || ''),
        role: String(row?.role || '').trim(),
        submittedAt: String(row?.submitted_at || '').trim(),
        contentTitle: String(row?.regear_contents?.title || '').trim(),
      }));

      return res.status(200).json({
        success: true,
        linked: true,
        playerId: linkedPlayerId,
        pendingCount: submissions.length,
        submissions,
        message: submissions.length > 0
          ? `${submissions.length} adet bekleyen regear talebin var.`
          : 'Bekleyen regear talebin bulunmuyor.',
      });
    }

    let player;
    try {
      player = await getPlayerBalance(linkedPlayerId);
    } catch (error) {
      if (error instanceof HttpError && error.status === 404) {
        return res.status(200).json({
          success: true,
          discordId,
          playerId: linkedPlayerId,
          playerName: '',
          balance: 0,
          balanceFormatted: '0',
          message: 'Bagli karakter bulunamadi. Site yoneticisiyle kontrol et.',
        });
      }
      throw error;
    }

    return res.status(200).json({
      success: true,
      discordId,
      playerId: player.id,
      playerName: player.name,
      balance: player.balance,
      balanceFormatted: formatSilver(player.balance),
      message: `${player.name} balance: ${formatSilver(player.balance)} Silver`,
    });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    return res.status(status).json({
      success: false,
      error: error.message || 'Unexpected discord balance error.',
    });
  }
}
