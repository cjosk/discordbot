import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { authenticateRequest } from './_auth.js';
import { HttpError } from './_error.js';
import { enforceUserRateLimit } from './_rateLimit.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const INDEX_PATH = path.join(__dirname, '..', 'data', 'shop-items-index.json');

const aliasMap = new Map([
  ['omelet', 'omelette'],
  ['omelette', 'omelette'],
  ['cavring', 'carving'],
  ['carvin', 'carving'],
]);

const normalizeText = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}.@]+/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => aliasMap.get(token) || token)
    .join(' ');

const tokenize = (value) => normalizeText(value).split(/\s+/).filter(Boolean);

const deriveTierMeta = (uniqueName) => {
  const normalized = String(uniqueName || '');
  const tierMatch = normalized.match(/^T(\d+)_/i);
  const enchantMatch = normalized.match(/@(\d+)$/);
  const baseTier = tierMatch ? Number(tierMatch[1]) : null;
  const enchant = enchantMatch ? Number(enchantMatch[1]) : 0;

  return {
    tierLabel: baseTier ? `T${baseTier}` : '',
    enchantLabel: baseTier ? `${baseTier}.${enchant}` : '',
  };
};

const buildIconUrl = (uniqueName) =>
  `/api/shop-icon?item=${encodeURIComponent(uniqueName)}`;

const loadIndex = () => {
  const payload = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
  return (Array.isArray(payload) ? payload : []).map((item) => {
    const tierMeta = deriveTierMeta(item.uniqueName);
    return {
      uniqueName: item.uniqueName,
      label: item.label,
      iconUrl: buildIconUrl(item.uniqueName),
      searchText: normalizeText(
        `${item.label} ${item.uniqueName} ${tierMeta.tierLabel} ${tierMeta.enchantLabel}`,
      ),
      ...tierMeta,
    };
  });
};

const itemsIndex = loadIndex();

const scoreItem = (item, queryTokens) => {
  const haystack = tokenize(item.searchText);
  let score = 0;

  for (const token of queryTokens) {
    const exact = haystack.some((part) => part === token);
    const partial = haystack.some((part) => part.includes(token) || token.includes(part));

    if (exact) {
      score += 4;
      continue;
    }

    if (partial) {
      score += 2;
      continue;
    }

    return -1;
  }

  if (normalizeText(item.label).startsWith(queryTokens[0])) {
    score += 3;
  }

  return score;
};

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      throw new HttpError(405, 'Method not allowed.');
    }

    const auth = await authenticateRequest(req);
    await enforceUserRateLimit(req, auth.user.id, {
      scope: 'shop-items',
      limit: 40,
      windowMs: 60_000,
      message: 'Item search rate limit exceeded. Please slow down.',
    });
    const query = String(req.query?.q || '').trim();
    const queryTokens = tokenize(query);

    if (queryTokens.length === 0 || query.replace(/\s+/g, '').length < 2) {
      return res.status(200).json([]);
    }

    const results = itemsIndex
      .map((item) => ({ item, score: scoreItem(item, queryTokens) }))
      .filter((entry) => entry.score >= 0)
      .sort((left, right) => right.score - left.score || left.item.label.localeCompare(right.item.label))
      .slice(0, 20)
      .map(({ item }) => ({
        uniqueName: item.uniqueName,
        label: item.label,
        tierLabel: item.tierLabel,
        enchantLabel: item.enchantLabel,
        iconUrl: item.iconUrl,
      }));

    return res.status(200).json(results);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    return res.status(status).json({ error: error.message || 'Unexpected shop search error.' });
  }
}
