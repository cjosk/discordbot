const readLootApiUrl = (env) =>
  String(env?.LOOT_LOGVIEWER_API_URL || 'https://teamsupremacyhq.vercel.app/api/loot-logviewer').trim();

const readBotSecret = (env) => String(env?.LOOT_LOGVIEWER_BOT_SECRET || '').trim();

const lootApiFetch = async (action, payload, env) => {
  const url = new URL(readLootApiUrl(env));
  url.searchParams.set('action', action);
  const botSecret = readBotSecret(env);
  if (!botSecret) {
    throw new Error('LOOT_LOGVIEWER_API_URL or LOOT_LOGVIEWER_BOT_SECRET is not configured.');
  }

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'x-loot-bot-secret': botSecret,
    },
    body: JSON.stringify(payload || {}),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result?.error || 'Loot Logviewer API request failed.');
  }

  return result;
};

export const upsertDiscordAnnouncementEvent = async (payload, env) =>
  lootApiFetch('automation-upsert-discord-event', payload, env);

export const claimDueReminderJobs = async ({ now, limit = 25 }, env) =>
  lootApiFetch('automation-claim-jobs', { now, limit }, env);

export const completeReminderJob = async (payload, env) =>
  lootApiFetch('automation-complete-job', payload, env);
