import { authenticateRequest } from './_auth.js';
import { HttpError } from './_error.js';
import { enforceUserRateLimit } from './_rateLimit.js';
import { APP_USER_AGENT } from '../src/appConfig.js';

const ALBION_BB_MULTI_URL = 'https://europe.albionbb.com/battles/multi?ids=';
const ALBION_BB_SINGLE_URL_PREFIX = 'https://europe.albionbb.com/battles/';
const NUXT_DATA_PATTERN = /<script type="application\/json" data-nuxt-data="nuxt-app" data-ssr="true" id="__NUXT_DATA__">(?<data>[\s\S]*?)<\/script>/i;
const PLAYER_SECTION_PATTERN = /<h2 class="font-bold text-slate-300 uppercase">Players \(\d+\)<\/h2>[\s\S]*?<tbody class="tracking-tight text-slate-50 tabular-nums"><!--\[-->(?<rows>[\s\S]*?)<\/tbody>/i;
const PLAYER_ROW_PATTERN = /<tr[^>]*>\s*<td[^>]*>[\s\S]*?<a[^>]*>(?<name>[^<]+)<\/a><\/td>(?:\s*<td[^>]*>(?<guild>[^<]*)<\/td>)?/gi;

const decodeHtmlEntities = (value) =>
  String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

const normalizePlayerName = (value) =>
  decodeHtmlEntities(value)
    .replace(/\s+/g, ' ')
    .trim();

const buildSourceFromIds = (ids) => ({
  ids,
  sourceUrl: `${ALBION_BB_MULTI_URL}${ids.join(',')}`,
});

const parseInput = (input) => {
  const rawValue = String(input || '').trim();
  if (!rawValue) {
    throw new HttpError(400, 'AlbionBB linki veya ids parametresi zorunlu.');
  }

  if (!/^https?:\/\//i.test(rawValue)) {
    const ids = rawValue
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);

    if (ids.length === 0 || ids.some((entry) => !/^\d+$/.test(entry))) {
      throw new HttpError(400, 'Gecersiz battle ids degeri.');
    }

    return buildSourceFromIds(ids);
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(rawValue);
  } catch {
    throw new HttpError(400, 'Gecersiz AlbionBB linki.');
  }

  const host = parsedUrl.hostname.toLowerCase();
  if (!host.endsWith('albionbb.com')) {
    throw new HttpError(400, 'Sadece AlbionBB linkleri desteklenir.');
  }

  const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
  if (pathParts[0] !== 'battles') {
    throw new HttpError(400, 'Desteklenmeyen AlbionBB battle linki.');
  }

  if (pathParts[1] === 'multi') {
    const ids = (parsedUrl.searchParams.get('ids') || '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);

    if (ids.length === 0 || ids.some((entry) => !/^\d+$/.test(entry))) {
      throw new HttpError(400, 'Gecersiz battle ids degeri.');
    }

    return buildSourceFromIds(ids);
  }

  const battleId = pathParts[1] || '';
  if (!/^\d+$/.test(battleId)) {
    throw new HttpError(400, 'Gecersiz battle id degeri.');
  }

  return {
    ids: [battleId],
    sourceUrl: `${ALBION_BB_SINGLE_URL_PREFIX}${battleId}`,
  };
};

const parsePlayerNamesFromNuxtData = (html) => {
  const nuxtMatch = html.match(NUXT_DATA_PATTERN);
  if (!nuxtMatch?.groups?.data) {
    return [];
  }

  let parsed;
  try {
    parsed = JSON.parse(nuxtMatch.groups.data);
  } catch {
    return [];
  }

  const names = new Set();

  for (const entry of parsed) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
    if (!Object.hasOwn(entry, 'name')) continue;
    if (typeof entry.name !== 'number') continue;

    const resolvedName = normalizePlayerName(parsed[entry.name]);
    if (!resolvedName) continue;

    if (
      Object.hasOwn(entry, 'guildName')
      || Object.hasOwn(entry, 'allianceName')
      || Object.hasOwn(entry, 'killFame')
      || Object.hasOwn(entry, 'deaths')
      || Object.hasOwn(entry, 'assists')
    ) {
      names.add(resolvedName);
    }
  }

  return [...names];
};

const parsePlayerNamesFromHtmlTable = (html) => {
  const sectionMatch = html.match(PLAYER_SECTION_PATTERN);
  if (!sectionMatch?.groups?.rows) {
    return [];
  }

  const names = new Set();

  for (const match of sectionMatch.groups.rows.matchAll(PLAYER_ROW_PATTERN)) {
    const playerName = normalizePlayerName(match.groups?.name || '');
    if (playerName) {
      names.add(playerName);
    }
  }

  return [...names];
};

const parsePlayerNames = (html) => {
  const nuxtNames = parsePlayerNamesFromNuxtData(html);
  if (nuxtNames.length > 0) {
    return nuxtNames;
  }

  const htmlNames = parsePlayerNamesFromHtmlTable(html);
  if (htmlNames.length > 0) {
    return htmlNames;
  }

  throw new HttpError(502, 'AlbionBB oyuncu listesi okunamadi.');
};

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed.' });
    }

    const auth = await authenticateRequest(req);
    await enforceUserRateLimit(req, auth.user.id, {
      scope: 'albionbb-battle',
      limit: 10,
      windowMs: 60_000,
      message: 'AlbionBB import rate limit exceeded. Please try again shortly.',
    });

    const { ids, sourceUrl } = parseInput(req.query?.url || req.query?.ids);

    const response = await fetch(sourceUrl, {
      headers: {
        'User-Agent': APP_USER_AGENT,
      },
    });

    if (!response.ok) {
      throw new HttpError(response.status, 'AlbionBB sayfasi alinamadi.');
    }

    const html = await response.text();
    const names = parsePlayerNames(html);

    return res.status(200).json({
      ids,
      sourceUrl,
      names,
    });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    return res.status(status).json({ error: error.message || 'AlbionBB import failed.' });
  }
}
