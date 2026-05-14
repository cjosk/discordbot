const readBalanceApiUrl = (env) =>
  String(env?.BALANCE_API_URL || 'https://teamsupremacyhq.vercel.app/api/discord-balance').trim();

const fetchJson = async (url) => {
  const response = await fetch(url);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.error || 'Request failed.');
  }

  return payload;
};

export const fetchBalance = async (discordId, env) => {
  const url = new URL(readBalanceApiUrl(env));
  url.searchParams.set('discordId', discordId);
  return fetchJson(url.toString());
};
