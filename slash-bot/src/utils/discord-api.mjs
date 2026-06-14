const DISCORD_API_BASE = 'https://discord.com/api/v10';

const readBotToken = (env) => String(env?.DISCORD_BOT_TOKEN || '').trim();

const discordFetch = async (path, env, init = {}) => {
  const token = readBotToken(env);
  if (!token) {
    throw new Error('DISCORD_BOT_TOKEN is not configured.');
  }

  const response = await fetch(`${DISCORD_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json; charset=utf-8',
      ...(init.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message || `Discord API request failed with ${response.status}.`);
  }

  return payload;
};

export const fetchChannelMessages = async (channelId, env, { limit = 25 } = {}) =>
  discordFetch(`/channels/${encodeURIComponent(channelId)}/messages?limit=${Math.max(1, Math.min(100, Number(limit) || 25))}`, env);

export const createDmChannel = async (userId, env) =>
  discordFetch('/users/@me/channels', env, {
    method: 'POST',
    body: JSON.stringify({
      recipient_id: String(userId),
    }),
  });

export const sendChannelMessage = async (channelId, payload, env) =>
  discordFetch(`/channels/${encodeURIComponent(channelId)}/messages`, env, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const sendDirectMessage = async (userId, payload, env) => {
  const dmChannel = await createDmChannel(userId, env);
  return sendChannelMessage(dmChannel.id, payload, env);
};
