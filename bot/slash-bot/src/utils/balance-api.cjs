const { config } = require('../config.cjs');

const fetchJson = async (url) => {
  const response = await fetch(url);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.error || 'Request failed.');
  }

  return payload;
};

const fetchBalance = async (discordId) => {
  const url = new URL(config.balanceApiUrl);
  url.searchParams.set('discordId', discordId);
  return fetchJson(url.toString());
};

module.exports = {
  fetchBalance,
};
