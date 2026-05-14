import {
  ADMIN_IDS,
  ADMIN_PLAYER_NAMES,
  ADMIN_ROLE_IDS,
  CHIEF_IDS,
  CHIEF_PLAYER_NAMES,
  CHIEF_ROLE_IDS,
} from './authConfig.js';

export const ROLES = {
  ADMIN: 'admin',
  CHIEF: 'chief',
  MEMBER: 'member'
};

const ROLE_RANK = {
  [ROLES.MEMBER]: 0,
  [ROLES.CHIEF]: 1,
  [ROLES.ADMIN]: 2,
};

// Define minimum roles required for each tab
export const TAB_PERMISSIONS = {
  'Dashboard': [ROLES.MEMBER, ROLES.CHIEF, ROLES.ADMIN],
  'Bank': [ROLES.MEMBER, ROLES.CHIEF, ROLES.ADMIN],
  'Split': [ROLES.MEMBER, ROLES.CHIEF, ROLES.ADMIN],
  'Approvals': [ROLES.CHIEF, ROLES.ADMIN],
  'SplitApprovals': [ROLES.CHIEF, ROLES.ADMIN],
  'Regear': [ROLES.MEMBER, ROLES.CHIEF, ROLES.ADMIN],
  'RegearApprovals': [ROLES.CHIEF, ROLES.ADMIN],
  'Withdraw': [ROLES.MEMBER, ROLES.CHIEF, ROLES.ADMIN],
  'WithdrawalApprovals': [ROLES.ADMIN],
  'Shop': [ROLES.MEMBER, ROLES.CHIEF, ROLES.ADMIN],
  'ShopOrders': [ROLES.CHIEF, ROLES.ADMIN],
  'BattlePass': [ROLES.MEMBER, ROLES.CHIEF, ROLES.ADMIN],
  'BattlePassAdmin': [ROLES.CHIEF, ROLES.ADMIN],
  'Analytics': [ROLES.ADMIN],
  'Activity': [ROLES.MEMBER, ROLES.CHIEF, ROLES.ADMIN],
  'History': [ROLES.MEMBER, ROLES.CHIEF, ROLES.ADMIN],
  'Settings': [ROLES.ADMIN]
};

const normalizeNickname = (value) => String(value || '').trim().toLocaleLowerCase();

export const getHigherRole = (...roles) =>
  roles
    .filter((role) => Object.prototype.hasOwnProperty.call(ROLE_RANK, role))
    .sort((left, right) => ROLE_RANK[right] - ROLE_RANK[left])[0] || ROLES.MEMBER;

export const resolveLinkedPlayerRole = (playerName = '') => {
  const normalizedPlayerName = normalizeNickname(playerName);
  if (!normalizedPlayerName) return ROLES.MEMBER;

  if (ADMIN_PLAYER_NAMES.includes(normalizedPlayerName)) return ROLES.ADMIN;
  if (CHIEF_PLAYER_NAMES.includes(normalizedPlayerName)) return ROLES.CHIEF;

  return ROLES.MEMBER;
};

export const resolveDiscordRole = (discordId, memberRoleIds = []) => {
  const normalizedRoles = Array.isArray(memberRoleIds) ? memberRoleIds : [];

  if (ADMIN_IDS.includes(discordId)) return ROLES.ADMIN;
  if (CHIEF_IDS.includes(discordId)) return ROLES.CHIEF;
  if (normalizedRoles.some((roleId) => ADMIN_ROLE_IDS.includes(roleId))) return ROLES.ADMIN;
  if (normalizedRoles.some((roleId) => CHIEF_ROLE_IDS.includes(roleId))) return ROLES.CHIEF;

  return ROLES.MEMBER;
};

export const resolveUserRole = (discordId, memberRoleIds = [], playerName = '') =>
  getHigherRole(
    resolveDiscordRole(discordId, memberRoleIds),
    resolveLinkedPlayerRole(playerName),
  );

export const getUserRole = (discordId, memberRoleIds = [], playerName = '') =>
  resolveUserRole(discordId, memberRoleIds, playerName);
