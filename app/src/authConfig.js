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

const parseIdList = (value) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const parseNicknameList = (value) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim().toLocaleLowerCase())
    .filter(Boolean);

export const DISCORD_CLIENT_ID =
  readEnv('VITE_DISCORD_CLIENT_ID', 'DISCORD_CLIENT_ID') || '1412951643741356215';

export const DISCORD_GUILD_ID =
  readEnv('VITE_DISCORD_GUILD_ID', 'DISCORD_GUILD_ID') || '1322262729888759910';

export const DISCORD_MEMBER_ROLE_ID =
  readEnv('VITE_DISCORD_MEMBER_ROLE_ID', 'DISCORD_MEMBER_ROLE_ID') || '1322893756525051905';

export const DISCORD_MEMBER_ROLE_IDS = Array.from(
  new Set([
    ...parseIdList(readEnv('VITE_DISCORD_MEMBER_ROLE_IDS', 'DISCORD_MEMBER_ROLE_IDS')),
    ...parseIdList(DISCORD_MEMBER_ROLE_ID),
  ]),
);

export const STATIC_ADMIN_IDS = ['140870990816083968'];
export const STATIC_CHIEF_IDS = [];
export const STATIC_ADMIN_PLAYER_NAMES = ['yigitggg', 'sunbird', 'quazatesistaken', 'rytners', 'mtalha'];
export const STATIC_CHIEF_PLAYER_NAMES = [];

export const ADMIN_IDS = Array.from(
  new Set([
    ...STATIC_ADMIN_IDS,
    ...parseIdList(readEnv('VITE_DISCORD_ADMIN_IDS', 'DISCORD_ADMIN_IDS')),
  ]),
);

export const CHIEF_IDS = Array.from(
  new Set([
    ...STATIC_CHIEF_IDS,
    ...parseIdList(readEnv('VITE_DISCORD_CHIEF_IDS', 'DISCORD_CHIEF_IDS')),
  ]),
);

export const ADMIN_ROLE_IDS = parseIdList(
  readEnv('VITE_DISCORD_ADMIN_ROLE_IDS', 'DISCORD_ADMIN_ROLE_IDS'),
);

export const CHIEF_ROLE_IDS = parseIdList(
  readEnv('VITE_DISCORD_CHIEF_ROLE_IDS', 'DISCORD_CHIEF_ROLE_IDS'),
);

export const ADMIN_PLAYER_NAMES = Array.from(
  new Set([
    ...STATIC_ADMIN_PLAYER_NAMES.map((item) => item.toLocaleLowerCase()),
    ...parseNicknameList(readEnv('VITE_DISCORD_ADMIN_PLAYER_NAMES', 'DISCORD_ADMIN_PLAYER_NAMES')),
  ]),
);

export const CHIEF_PLAYER_NAMES = Array.from(
  new Set([
    ...STATIC_CHIEF_PLAYER_NAMES.map((item) => item.toLocaleLowerCase()),
    ...parseNicknameList(readEnv('VITE_DISCORD_CHIEF_PLAYER_NAMES', 'DISCORD_CHIEF_PLAYER_NAMES')),
  ]),
);

export const CLOUDINARY_CLOUD_NAME =
  readEnv('VITE_CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_CLOUD_NAME') || '';

export const CLOUDINARY_API_KEY =
  readEnv('VITE_CLOUDINARY_API_KEY', 'CLOUDINARY_API_KEY') || '';
