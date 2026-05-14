import { create } from 'zustand';

import { FEATURES } from './features';
import { buildDefaultRegearAmounts, normalizeRegearAmounts } from './regearConfig';
import { getHigherRole, resolveUserRole } from './roles';

const USER_STORAGE_KEY = 'sb_user';
const TOKEN_STORAGE_KEY = 'sb_token';

const getBrowserStorage = () => {
  if (typeof window === 'undefined') {
    return { session: null, legacy: null };
  }

  return {
    session: window.sessionStorage,
    legacy: window.localStorage,
  };
};

const readStoredValue = (key) => {
  const { session, legacy } = getBrowserStorage();
  const value = session?.getItem(key) ?? legacy?.getItem(key) ?? null;

  if (value && legacy?.getItem(key)) {
    session?.setItem(key, value);
    legacy.removeItem(key);
  }

  return value;
};

const readStoredJson = (key) => {
  try {
    return JSON.parse(readStoredValue(key) || 'null');
  } catch {
    return null;
  }
};

const persistAuth = (user, token) => {
  const { session, legacy } = getBrowserStorage();

  if (user) {
    session?.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } else {
    session?.removeItem(USER_STORAGE_KEY);
  }

  if (token) {
    session?.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    session?.removeItem(TOKEN_STORAGE_KEY);
  }

  legacy?.removeItem(USER_STORAGE_KEY);
  legacy?.removeItem(TOKEN_STORAGE_KEY);
};

const resolveLinkedPlayerName = (userId, players = [], discordLinks = {}) => {
  const linkedPlayerId = discordLinks[String(userId)];
  if (!linkedPlayerId) return '';

  const linkedPlayer = players.find((player) => String(player.id) === String(linkedPlayerId));
  return linkedPlayer?.player || '';
};

const normalizeStoredUser = (user) => {
  if (!user?.id) return null;

  const memberRoleIds = Array.isArray(user.member_role_ids) ? user.member_role_ids : [];

  return {
    ...user,
    id: String(user.id),
    member_role_ids: memberRoleIds,
    role: getHigherRole(user.role, resolveUserRole(String(user.id), memberRoleIds)),
  };
};

const ensureArray = (value) => (Array.isArray(value) ? value : []);

const mapPlayer = (player) => ({
  id: String(player.id),
  player: player.name,
  balance: Number(player.balance) || 0,
  lootSplit: Number(player.loot_split) || 0,
  issued: Number(player.issued) || 0,
  compensations: Number(player.compensations) || 0,
  sets: Number(player.sets) || 0,
  trash: Number(player.trash) || 0,
  deposited: Number(player.deposited) || 0,
  withdrawn: Number(player.withdrawn) || 0,
  activity: Number(player.activity) || 0,
});

const normalizeSplit = (split) => ({
  ...split,
  participants: Array.isArray(split?.participants) ? split.participants : [],
  participant_names: Array.isArray(split?.participant_names) ? split.participant_names : [],
});

const resetLoadState = {
  hasLoadedPlayers: false,
  hasLoadedDiscordLinks: false,
  hasLoadedPendingSplits: false,
  hasLoadedRegearContents: false,
  hasLoadedRegearAmounts: false,
  hasLoadedRegearSubmissions: false,
  hasLoadedWithdrawalRequests: false,
  hasLoadedShopOrders: false,
  hasLoadedBattlePass: false,
};

const updatePlayerById = (players, playerId, updates) =>
  players.map((player) =>
    String(player.id) === String(playerId)
      ? { ...player, ...updates }
      : player);

const updatePlayersForParticipants = (players, participants, updater) => {
  const participantSet = new Set((participants || []).map((value) => String(value)));

  return players.map((player) => {
    const matches =
      participantSet.has(String(player.id))
      || participantSet.has(String(player.player || ''));

    return matches ? updater(player) : player;
  });
};

const sortByCreatedDesc = (items, fieldNames = ['submitted_at', 'created_at']) =>
  [...items].sort((left, right) => {
    const leftValue = fieldNames.map((field) => left?.[field]).find(Boolean);
    const rightValue = fieldNames.map((field) => right?.[field]).find(Boolean);
    return new Date(rightValue || 0) - new Date(leftValue || 0);
  });

export const useStore = create((set, get) => {
  const syncCurrentUserRole = (players = get().players, discordLinks = get().discordLinks) => {
    const currentUser = get().user;
    if (!currentUser?.id) return;

    const linkedPlayerName = resolveLinkedPlayerName(currentUser.id, players, discordLinks);
    const nextRole = getHigherRole(
      currentUser.role,
      resolveUserRole(String(currentUser.id), currentUser.member_role_ids, linkedPlayerName),
    );

    if (nextRole === currentUser.role) {
      return;
    }

    const nextUser = { ...currentUser, role: nextRole };
    persistAuth(nextUser, get().token);
    set({ user: nextUser });
  };

  const apiFetch = async (path, options = {}) => {
    const headers = {
      ...(options.headers || {}),
    };

    const token = get().token;
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(path, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      get().logout();
    }

    if (!response.ok) {
      let message = 'Request failed.';

      try {
        const payload = await response.json();
        message = payload?.error || message;
      } catch {
        // Ignore JSON parsing failures for non-JSON errors.
      }

      throw new Error(message);
    }

    if (response.status === 204) {
      return null;
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return null;
    }

    return response.json();
  };

  return {
    activeTab: 'Dashboard',
    setActiveTab: (tab) => set({ activeTab: tab }),

    user: normalizeStoredUser(readStoredJson(USER_STORAGE_KEY)),
    token: readStoredValue(TOKEN_STORAGE_KEY),

    login: (userData, token, memberRoleIds = []) => {
      const normalizedRoleIds = Array.isArray(userData.member_role_ids)
        ? userData.member_role_ids
        : memberRoleIds;
      const role = getHigherRole(userData.role, resolveUserRole(String(userData.id), normalizedRoleIds));
      const user = normalizeStoredUser({ ...userData, member_role_ids: normalizedRoleIds, role });
      persistAuth(user, token);
      set({ user, token });
    },

    logout: () => {
      persistAuth(null, null);
      set({
        user: null,
        token: null,
        activeTab: 'Dashboard',
        players: [],
        discordLinks: {},
        pendingSplits: [],
        regearContents: [],
        regearAmounts: buildDefaultRegearAmounts(),
        regearSubmissions: [],
        withdrawalRequests: [],
        shopOrders: [],
        battlePassData: null,
        systemConfig: null,
        isLoadingPlayers: false,
        isLoadingDiscordLinks: false,
        isLoadingPendingSplits: false,
        isLoadingRegearContents: false,
        isLoadingRegearAmounts: false,
        isLoadingRegearSubmissions: false,
        isLoadingWithdrawalRequests: false,
        isLoadingShopOrders: false,
        isLoadingBattlePass: false,
        ...resetLoadState,
      });
    },

    players: [],
    isLoadingPlayers: false,
    hasLoadedPlayers: false,

    fetchPlayers: async ({ force = false } = {}) => {
      if (get().isLoadingPlayers || (get().hasLoadedPlayers && !force)) {
        return get().players;
      }

      set({ isLoadingPlayers: true });

      try {
        const data = ensureArray(await apiFetch('/api/db?table=players'));
        const players = data.map(mapPlayer);
        set({
          players,
          isLoadingPlayers: false,
          hasLoadedPlayers: true,
        });
        syncCurrentUserRole(players, get().discordLinks);
        return players;
      } catch (error) {
        console.error('Failed to fetch players:', error);
        set({ isLoadingPlayers: false });
        return [];
      }
    },

    updatePlayerBalance: async (playerId, field, amount) => {
      const fieldMap = {
        balance: 'balance',
        lootSplit: 'loot_split',
        issued: 'issued',
        compensations: 'compensations',
        sets: 'sets',
        trash: 'trash',
        deposited: 'deposited',
        withdrawn: 'withdrawn',
      };

      const dbField = fieldMap[field] || field;
      const player = get().players.find((entry) => entry.id === playerId);
      if (!player) return;

      const newValue = (player[field] || 0) + amount;

      try {
        await apiFetch('/api/db?table=players', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: playerId, [dbField]: newValue }),
        });

        set((state) => ({
          players: updatePlayerById(state.players, playerId, { [field]: newValue }),
        }));
      } catch (error) {
        console.error('Failed to update player balance:', error);
      }
    },

    discordLinks: {},
    isLoadingDiscordLinks: false,
    hasLoadedDiscordLinks: false,

    fetchDiscordLinks: async ({ force = false } = {}) => {
      if (get().isLoadingDiscordLinks || (get().hasLoadedDiscordLinks && !force)) {
        return get().discordLinks;
      }

      set({ isLoadingDiscordLinks: true });

      try {
        const data = ensureArray(await apiFetch('/api/db?table=discord_links'));
        const links = {};
        data.forEach((entry) => {
          links[String(entry.discord_id)] = String(entry.player_id);
        });
        set({
          discordLinks: links,
          isLoadingDiscordLinks: false,
          hasLoadedDiscordLinks: true,
        });
        syncCurrentUserRole(get().players, links);
        return links;
      } catch (error) {
        console.error('Failed to fetch discord links:', error);
        set({ isLoadingDiscordLinks: false });
        return {};
      }
    },

    setDiscordLink: async (discordId, playerId) => {
      try {
        const [link] = [].concat(
          (await apiFetch('/api/db?table=discord_links', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ discord_id: discordId, player_id: playerId }),
          })) || [],
        );

        const effectiveDiscordId = String(link?.discord_id || discordId);
        const effectivePlayerId = String(link?.player_id || playerId);

        set((state) => ({
          discordLinks: { ...state.discordLinks, [effectiveDiscordId]: effectivePlayerId },
          hasLoadedDiscordLinks: true,
        }));
        syncCurrentUserRole(get().players, {
          ...get().discordLinks,
          [effectiveDiscordId]: effectivePlayerId,
        });

        // Linking changes which player row the member is allowed to see privately.
        // Force a refresh so balance and other private fields appear immediately.
        await get().fetchPlayers({ force: true });
      } catch (error) {
        console.error('Failed to set discord link:', error);
        throw error;
      }
    },

    pendingSplits: [],
    isLoadingPendingSplits: false,
    hasLoadedPendingSplits: false,

    fetchPendingSplits: async ({ force = false } = {}) => {
      if (get().isLoadingPendingSplits || (get().hasLoadedPendingSplits && !force)) {
        return get().pendingSplits;
      }

      set({ isLoadingPendingSplits: true });

      try {
        const data = ensureArray(await apiFetch('/api/db?table=splits'));
        const pendingSplits = data.map(normalizeSplit);
        set({
          pendingSplits,
          isLoadingPendingSplits: false,
          hasLoadedPendingSplits: true,
        });
        return pendingSplits;
      } catch (error) {
        console.error('Failed to fetch splits:', error);
        set({ isLoadingPendingSplits: false });
        return [];
      }
    },

    submitSplit: async (splitData) => {
      const payload = {
        id: crypto.randomUUID(),
        splitName: splitData.splitName,
        lootImage: splitData.lootImage,
        grossTotal: splitData.grossTotal,
        repairFee: splitData.repairFee,
        netTotal: splitData.netTotal,
        perPerson: splitData.perPerson,
        participants: splitData.participants,
        participantNames: splitData.participantNames,
      };

      const createdSplit = await apiFetch('/api/db?table=splits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      set((state) => ({
        pendingSplits: [normalizeSplit(createdSplit), ...state.pendingSplits],
        hasLoadedPendingSplits: true,
      }));
    },

    resolveSplit: async (splitId, resolution) => {
      try {
        await apiFetch('/api/db?table=splits', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: splitId, resolution }),
        });

        set((state) => {
          const targetSplit = state.pendingSplits.find((split) => split.id === splitId);
          const approved = resolution === 'approve' || resolution === 'approved';
          const nextStatus = approved ? 'approved' : 'rejected';
          const nextPlayers = approved && targetSplit
            ? updatePlayersForParticipants(
              state.players,
              targetSplit.participants,
              (player) => ({
                ...player,
                balance: (player.balance || 0) + (targetSplit.per_person || targetSplit.perPerson || 0),
                lootSplit: (player.lootSplit || 0) + (targetSplit.per_person || targetSplit.perPerson || 0),
              }),
            )
            : state.players;

          return {
            players: nextPlayers,
            pendingSplits: state.pendingSplits.map((split) =>
              split.id === splitId ? { ...split, status: nextStatus } : split),
          };
        });

        if (FEATURES.battlePass) {
          await get().fetchBattlePass({ force: true });
        }
      } catch (error) {
        console.error('Failed to resolve split:', error);
        throw error;
      }
    },

    syncGuildMembers: async () => {
      try {
        const result = await apiFetch('/api/db?table=sync');
        await get().fetchPlayers({ force: true });
        return result;
      } catch (error) {
        console.error('Sync failed:', error);
        return null;
      }
    },

    systemConfig: null,
    isLoadingSystemConfig: false,

    fetchSystemConfig: async () => {
      set({ isLoadingSystemConfig: true });

      try {
        const data = await apiFetch('/api/db?table=system');
        set({ systemConfig: data, isLoadingSystemConfig: false });
        return data;
      } catch (error) {
        console.error('Failed to fetch system config:', error);
        set({ isLoadingSystemConfig: false });
        return null;
      }
    },

    adminSyncGuild: async (guildId = '') => {
      const result = await apiFetch('/api/db?table=system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_guild', guildId }),
      });

      await get().fetchPlayers({ force: true });
      return result;
    },

    adminAddManualPlayerByNickname: async (nickname) => {
      const result = await apiFetch('/api/db?table=system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_manual_player', nickname }),
      });

      await get().fetchPlayers({ force: true });
      return result;
    },

    adminResetAndSyncGuild: async ({ guildId = '', confirmation }) => {
      const result = await apiFetch('/api/db?table=system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset_and_sync_guild',
          guildId,
          confirmation,
        }),
      });

      await Promise.all([
        get().fetchPlayers({ force: true }),
        get().fetchDiscordLinks({ force: true }),
        get().fetchPendingSplits({ force: true }),
        get().fetchRegearContents({ force: true }),
        get().fetchRegearSubmissions({ force: true }),
        get().fetchWithdrawalRequests({ force: true }),
        get().fetchShopOrders({ force: true }),
      ]);

      if (FEATURES.battlePass) {
        await get().fetchBattlePass({ force: true });
      } else {
        set({ battlePassData: null, hasLoadedBattlePass: false });
      }

      return result;
    },

    regearContents: [],
    isLoadingRegearContents: false,
    hasLoadedRegearContents: false,

    fetchRegearContents: async ({ force = false } = {}) => {
      if (get().isLoadingRegearContents || (get().hasLoadedRegearContents && !force)) {
        return get().regearContents;
      }

      set({ isLoadingRegearContents: true });

      try {
        const data = ensureArray(await apiFetch('/api/db?table=regear_contents'));
        set({
          regearContents: data,
          isLoadingRegearContents: false,
          hasLoadedRegearContents: true,
        });
        return data;
      } catch (error) {
        console.error('Failed to fetch regear contents:', error);
        set({ isLoadingRegearContents: false });
        return [];
      }
    },

    regearAmounts: buildDefaultRegearAmounts(),
    isLoadingRegearAmounts: false,
    hasLoadedRegearAmounts: false,

    fetchRegearAmounts: async ({ force = false } = {}) => {
      if (get().isLoadingRegearAmounts || (get().hasLoadedRegearAmounts && !force)) {
        return get().regearAmounts;
      }

      set({ isLoadingRegearAmounts: true });

      try {
        const data = await apiFetch('/api/db?table=regear_config');
        const amounts = normalizeRegearAmounts(data?.amounts);
        set({
          regearAmounts: amounts,
          isLoadingRegearAmounts: false,
          hasLoadedRegearAmounts: true,
        });
        return amounts;
      } catch (error) {
        console.error('Failed to fetch regear amounts:', error);
        set({ isLoadingRegearAmounts: false });
        return buildDefaultRegearAmounts();
      }
    },

    saveRegearAmounts: async (amounts) => {
      const payload = normalizeRegearAmounts(amounts);
      set({
        regearAmounts: payload,
        hasLoadedRegearAmounts: true,
      });

      const result = await apiFetch('/api/db?table=regear_config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amounts: payload }),
      });

      const savedAmounts = normalizeRegearAmounts(result?.amounts);
      set({
        regearAmounts: savedAmounts,
        hasLoadedRegearAmounts: true,
      });

      return savedAmounts;
    },

    createRegearContent: async (title, createdBy) => {
      const created = await apiFetch('/api/db?table=regear_contents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: crypto.randomUUID(), title, created_by: createdBy }),
      });

      set((state) => ({
        regearContents: [created, ...state.regearContents],
        hasLoadedRegearContents: true,
      }));
    },

    deleteRegearContent: async (id) => {
      await apiFetch('/api/db?table=regear_contents', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      set((state) => ({
        regearContents: state.regearContents.filter((entry) => entry.id !== id),
      }));
    },

    regearSubmissions: [],
    isLoadingRegearSubmissions: false,
    hasLoadedRegearSubmissions: false,

    fetchRegearSubmissions: async ({ force = false } = {}) => {
      if (get().isLoadingRegearSubmissions || (get().hasLoadedRegearSubmissions && !force)) {
        return get().regearSubmissions;
      }

      set({ isLoadingRegearSubmissions: true });

      try {
        const data = ensureArray(await apiFetch('/api/db?table=regear_submissions'));
        set({
          regearSubmissions: data,
          isLoadingRegearSubmissions: false,
          hasLoadedRegearSubmissions: true,
        });
        return data;
      } catch (error) {
        console.error('Failed to fetch regear submissions:', error);
        set({ isLoadingRegearSubmissions: false });
        return [];
      }
    },

    submitRegear: async (data) => {
      const created = await apiFetch('/api/db?table=regear_submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: crypto.randomUUID(), ...data }),
      });

      set((state) => ({
        regearSubmissions: [created, ...state.regearSubmissions],
        hasLoadedRegearSubmissions: true,
      }));
    },

    resolveRegear: async (id, status, payoutAmount = 0) => {
      const result = await apiFetch('/api/db?table=regear_submissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, payoutAmount }),
      });

      set((state) => {
        const submission = state.regearSubmissions.find((entry) => entry.id === id);
        const approvedPayout = status === 'approved'
          ? Math.max(0, Math.floor(Number(result?.payoutAmount) || 0))
          : 0;
        const nextPlayers = approvedPayout > 0 && submission?.player_id
          ? updatePlayerById(state.players, submission.player_id, {
            balance: (state.players.find((player) => player.id === submission.player_id)?.balance || 0) + approvedPayout,
            compensations: (state.players.find((player) => player.id === submission.player_id)?.compensations || 0) + approvedPayout,
          })
          : state.players;

        return {
          players: nextPlayers,
          regearSubmissions: state.regearSubmissions.map((entry) =>
            entry.id === id ? { ...entry, status } : entry),
        };
      });

      return result;
    },

    withdrawalRequests: [],
    isLoadingWithdrawalRequests: false,
    hasLoadedWithdrawalRequests: false,

    fetchWithdrawalRequests: async ({ force = false } = {}) => {
      if (get().isLoadingWithdrawalRequests || (get().hasLoadedWithdrawalRequests && !force)) {
        return get().withdrawalRequests;
      }

      set({ isLoadingWithdrawalRequests: true });

      try {
        const data = ensureArray(await apiFetch('/api/db?table=withdrawal_requests'));
        set({
          withdrawalRequests: data,
          isLoadingWithdrawalRequests: false,
          hasLoadedWithdrawalRequests: true,
        });
        return data;
      } catch (error) {
        console.error('Failed to fetch withdrawal requests:', error);
        set({ isLoadingWithdrawalRequests: false });
        return [];
      }
    },

    submitWithdrawalRequest: async (data) => {
      const created = await apiFetch('/api/db?table=withdrawal_requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: crypto.randomUUID(), ...data }),
      });

      set((state) => ({
        withdrawalRequests: [created, ...state.withdrawalRequests],
        hasLoadedWithdrawalRequests: true,
      }));
    },

    resolveWithdrawalRequest: async (id, status, rejectionReason = '') => {
      await apiFetch('/api/db?table=withdrawal_requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, rejectionReason }),
      });

      set((state) => {
        const request = state.withdrawalRequests.find((entry) => entry.id === id);
        const amount = Math.max(0, Math.floor(Number(request?.amount) || 0));
        const nextPlayers = status === 'approved' && request?.player_id
          ? updatePlayerById(state.players, request.player_id, {
            balance: (state.players.find((player) => player.id === request.player_id)?.balance || 0) - amount,
            withdrawn: (state.players.find((player) => player.id === request.player_id)?.withdrawn || 0) + amount,
          })
          : state.players;

        return {
          players: nextPlayers,
          withdrawalRequests: state.withdrawalRequests.map((entry) =>
            entry.id === id
              ? {
                ...entry,
                status,
                rejection_reason: status === 'rejected' ? rejectionReason : null,
              }
              : entry),
        };
      });
    },

    sendBalanceTransfer: async ({ recipientPlayerId, amount }) => {
      const result = await apiFetch('/api/db?table=balance_transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_player_id: recipientPlayerId,
          amount,
        }),
      });

      set((state) => ({
        players: state.players.map((player) => {
          if (String(player.id) === String(result?.sender?.id)) {
            return { ...player, balance: Number(result?.sender?.balance) || 0 };
          }
          if (String(player.id) === String(result?.recipient?.id)) {
            return { ...player, balance: Number(result?.recipient?.balance) || 0 };
          }
          return player;
        }),
      }));

      return result;
    },

    shopOrders: [],
    isLoadingShopOrders: false,
    hasLoadedShopOrders: false,

    fetchShopOrders: async ({ force = false } = {}) => {
      if (get().isLoadingShopOrders || (get().hasLoadedShopOrders && !force)) {
        return get().shopOrders;
      }

      set({ isLoadingShopOrders: true });

      try {
        const data = ensureArray(await apiFetch('/api/db?table=shop_orders'));
        set({
          shopOrders: sortByCreatedDesc(data, ['created_at']),
          isLoadingShopOrders: false,
          hasLoadedShopOrders: true,
        });
        return data;
      } catch (error) {
        console.error('Failed to fetch shop orders:', error);
        set({ isLoadingShopOrders: false });
        return [];
      }
    },

    submitShopOrder: async (data) => {
      const created = await apiFetch('/api/db?table=shop_orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: crypto.randomUUID(), ...data }),
      });

      set((state) => ({
        shopOrders: [created, ...state.shopOrders],
        hasLoadedShopOrders: true,
      }));
    },

    resolveShopOrder: async (id, status, payload = {}) => {
      const result = await apiFetch('/api/db?table=shop_orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, ...payload }),
      });

      set((state) => ({
        shopOrders: state.shopOrders.map((order) =>
          order.id === id
            ? {
              ...order,
              status,
              chest_location: payload.chestLocation ?? order.chest_location,
              pickup_note: payload.pickupNote ?? order.pickup_note,
              rejection_reason: payload.rejectionReason ?? (status === 'approved' ? null : order.rejection_reason),
            }
            : order),
      }));

      return result;
    },

    battlePassData: null,
    isLoadingBattlePass: false,
    hasLoadedBattlePass: false,

    fetchBattlePass: async ({ force = false } = {}) => {
      if (get().isLoadingBattlePass || (get().hasLoadedBattlePass && !force)) {
        return get().battlePassData;
      }

      set({ isLoadingBattlePass: true });

      try {
        const data = await apiFetch('/api/db?table=battle_pass');
        set({
          battlePassData: data,
          isLoadingBattlePass: false,
          hasLoadedBattlePass: true,
        });
        return data;
      } catch (error) {
        console.error('Failed to fetch battle pass:', error);
        set({ isLoadingBattlePass: false });
        return null;
      }
    },

    startBattlePassSeason: async (payload) => {
      await apiFetch('/api/db?table=battle_pass_admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start_season', ...payload }),
      });

      await get().fetchBattlePass({ force: true });
    },

    saveBattlePassRewards: async (seasonId, rewards) => {
      await apiFetch('/api/db?table=battle_pass_admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_rewards', seasonId, rewards }),
      });

      await get().fetchBattlePass({ force: true });
    },

    deliverBattlePassReward: async (unlockId) => {
      await apiFetch('/api/db?table=battle_pass_admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deliver_reward', unlockId }),
      });

      await get().fetchBattlePass({ force: true });
    },
  };
});
