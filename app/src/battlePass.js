export const BATTLE_PASS_TIME_ZONE = 'Europe/Istanbul';
export const BATTLE_PASS_MIN_PARTICIPANTS = 20;
export const DEFAULT_BATTLE_PASS_DURATION_DAYS = 30;
export const DEFAULT_BATTLE_PASS_SKIP_ALLOWANCE = 3;

export const DEFAULT_BATTLE_PASS_REWARDS = [
  { milestone_day: 1, reward_type: 'silver', silver_amount: 100000, item_label: '100k Silver', is_manual: false },
  { milestone_day: 3, reward_type: 'silver', silver_amount: 200000, item_label: '200k Silver', is_manual: false },
  { milestone_day: 5, reward_type: 'item', silver_amount: 0, item_label: 'Random Item', is_manual: true },
  { milestone_day: 7, reward_type: 'silver', silver_amount: 500000, item_label: '500k Silver', is_manual: false },
  { milestone_day: 10, reward_type: 'chest', silver_amount: 0, item_label: 'Battle Chest', is_manual: true },
  { milestone_day: 15, reward_type: 'silver', silver_amount: 1000000, item_label: '1M Silver', is_manual: false },
  { milestone_day: 20, reward_type: 'chest', silver_amount: 0, item_label: 'Rare Chest', is_manual: true },
  { milestone_day: 25, reward_type: 'silver', silver_amount: 2000000, item_label: '2M Silver', is_manual: false },
  { milestone_day: 30, reward_type: 'jackpot', silver_amount: 5000000, item_label: 'Jackpot', is_manual: true },
];

const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: BATTLE_PASS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const parseDateKey = (value) => {
  const [year, month, day] = String(value || '')
    .split('-')
    .map((part) => Number(part));

  if (!year || !month || !day) {
    return null;
  }

  return Date.UTC(year, month - 1, day);
};

export const getBattlePassDateKey = (value) => {
  if (!value) return '';

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const parts = dateFormatter.formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  return year && month && day ? `${year}-${month}-${day}` : '';
};

export const sortUniqueDateKeys = (values) =>
  [...new Set((Array.isArray(values) ? values : []).filter(Boolean))].sort((a, b) => {
    const left = parseDateKey(a) || 0;
    const right = parseDateKey(b) || 0;
    return left - right;
  });

export const getDiffDays = (fromKey, toKey) => {
  const from = parseDateKey(fromKey);
  const to = parseDateKey(toKey);

  if (from === null || to === null) return 0;
  return Math.max(0, Math.round((to - from) / 86400000));
};

export const getBattlePassParticipantCount = (split) =>
  Math.max(
    0,
    Number(
      split?.participant_count
      || split?.participantCount
      || (Array.isArray(split?.participants) ? split.participants.length : 0),
    ) || 0,
  );

export const isBattlePassEligibleSplit = (split) =>
  (split?.status || 'pending') === 'approved' && getBattlePassParticipantCount(split) >= BATTLE_PASS_MIN_PARTICIPANTS;

export const computeBattlePassProgress = (activityDateKeys, skipAllowance = DEFAULT_BATTLE_PASS_SKIP_ALLOWANCE) => {
  const uniqueDates = sortUniqueDateKeys(activityDateKeys);
  const normalizedAllowance = Math.max(0, Number(skipAllowance) || 0);

  if (uniqueDates.length === 0) {
    return {
      currentDay: 0,
      highestDay: 0,
      totalActivityDays: 0,
      skipsLeft: normalizedAllowance,
      resets: 0,
      lastActivityDate: null,
      timeline: [],
    };
  }

  let currentDay = 0;
  let highestDay = 0;
  let skipsLeft = normalizedAllowance;
  let resets = 0;
  let previousDateKey = null;

  const timeline = uniqueDates.map((dateKey) => {
    if (!previousDateKey) {
      currentDay = 1;
      highestDay = 1;
      previousDateKey = dateKey;

      return {
        dateKey,
        dayNumber: currentDay,
        consumedSkips: 0,
        skipsLeft,
        reset: false,
      };
    }

    const missedDays = Math.max(0, getDiffDays(previousDateKey, dateKey) - 1);
    let reset = false;
    let consumedSkips = 0;

    if (missedDays <= skipsLeft) {
      consumedSkips = missedDays;
      skipsLeft -= missedDays;
      currentDay += 1;
    } else {
      reset = true;
      resets += 1;
      skipsLeft = normalizedAllowance;
      currentDay = 1;
    }

    highestDay = Math.max(highestDay, currentDay);
    previousDateKey = dateKey;

    return {
      dateKey,
      dayNumber: currentDay,
      consumedSkips,
      skipsLeft,
      reset,
    };
  });

  return {
    currentDay,
    highestDay,
    totalActivityDays: uniqueDates.length,
    skipsLeft,
    resets,
    lastActivityDate: uniqueDates[uniqueDates.length - 1],
    timeline,
  };
};

export const normalizeBattlePassReward = (reward) => ({
  ...reward,
  milestone_day: Number(reward?.milestone_day) || 0,
  silver_amount: Number(reward?.silver_amount) || 0,
  is_manual: Boolean(reward?.is_manual),
});

export const getBattlePassRewardTitle = (reward, language = 'tr') => {
  const normalized = normalizeBattlePassReward(reward);

  if (normalized.reward_type === 'silver' && normalized.silver_amount > 0) {
    return language === 'tr'
      ? `${new Intl.NumberFormat('tr-TR').format(normalized.silver_amount)} Silver`
      : `${new Intl.NumberFormat('en-US').format(normalized.silver_amount)} Silver`;
  }

  return normalized.item_label || (language === 'tr' ? 'Odul' : 'Reward');
};
