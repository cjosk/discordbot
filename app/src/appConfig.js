const readEnv = (...keys) => {
  for (const key of keys) {
    if (typeof import.meta !== 'undefined' && import.meta.env?.[key]) {
      return import.meta.env[key];
    }

    if (typeof process !== 'undefined' && process.env?.[key]) {
      return process.env[key];
    }
  }

  return '';
};

const sanitizeUserAgentToken = (value) => {
  const token = String(value || '')
    .replace(/[^a-z0-9]+/gi, '')
    .trim();

  return token || 'GuildBank';
};

export const SITE_NAME =
  readEnv('VITE_SITE_NAME', 'SITE_NAME') || 'Supremacy HQ';

export const GUILD_NAME =
  readEnv('VITE_GUILD_NAME', 'GUILD_NAME') || 'Supremacy';

export const SHOP_NAME =
  readEnv('VITE_SHOP_NAME', 'SHOP_NAME') || `${GUILD_NAME} Shop`;

export const BATTLE_PASS_NAME =
  readEnv('VITE_BATTLE_PASS_NAME', 'BATTLE_PASS_NAME') || `${GUILD_NAME} Battle Pass`;

export const ALBION_GUILD_ID =
  readEnv('VITE_ALBION_GUILD_ID', 'ALBION_GUILD_ID') || '';

export const APP_USER_AGENT =
  readEnv('VITE_APP_USER_AGENT', 'APP_USER_AGENT')
  || `${sanitizeUserAgentToken(SITE_NAME)}/1.0`;

export const resolveAlbionGuildId = (overrideGuildId = '') =>
  String(overrideGuildId || '').trim() || ALBION_GUILD_ID;

export const getAlbionGuildMembersUrl = (overrideGuildId = '') => {
  const guildId = resolveAlbionGuildId(overrideGuildId);
  if (!guildId) return '';

  return `https://gameinfo-ams.albiononline.com/api/gameinfo/guilds/${encodeURIComponent(guildId)}/members`;
};
