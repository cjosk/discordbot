import {
  commandHandlers,
  createErrorMessageData,
  createUnknownCommandResponse,
  deferredResponse,
  getBlockedChannelResponse,
  resolveBalanceMessageData,
} from './src/commands.mjs';
import { verifyDiscordRequest } from './src/discord-interactions.mjs';
import { fetchBalance } from './src/utils/balance-api.mjs';
import { fetchChannelMessages, sendDirectMessage } from './src/utils/discord-api.mjs';
import {
  claimDueReminderJobs,
  completeReminderJob,
  upsertDiscordAnnouncementEvent,
} from './src/utils/loot-logviewer-api.mjs';

const CTA_CHANNEL_ID = '1322824303208566876';

const json = (payload, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });

const badRequest = (message, status = 400) => json({ error: message }, status);

const readGuildId = (env) => String(env?.DISCORD_GUILD_ID || '').trim();
const readAnnouncementChannelId = (env) =>
  String(env?.LOOT_LOGGER_CHANNEL_ID || CTA_CHANNEL_ID).trim();

const buildDiscordMessageUrl = (channelId, messageId, env) => {
  const guildId = readGuildId(env);
  if (!guildId || !channelId || !messageId) {
    return '';
  }
  return `https://discord.com/channels/${guildId}/${channelId}/${messageId}`;
};

const shouldParseAnnouncement = (message) =>
  message?.type === 0 && /MASS\s*TIME\s*:/i.test(String(message?.content || ''));

const formatUtcDateTime = (value) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Unknown UTC';
  return `${parsed.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
};

const buildReminderMessage = (job) => {
  const event = job?.event || {};
  const task = job?.task || {};
  const title = String(event.content_title || 'Loot Logger Task').trim();
  const startAt = formatUtcDateTime(event.event_start_at);
  const dueAt = formatUtcDateTime(event.submission_due_at);
  const uploadUrl = task.upload_link_url || job?.payload?.upload_link || '';
  const actionLine = uploadUrl ? `Upload link: ${uploadUrl}` : 'Upload link: unavailable';

  if (job?.ping_type === 'pre_reminder') {
    return [
      `Loot logger reminder for ${title}`,
      `Mass start: ${startAt}`,
      'Please open your loot logger before the CTA starts.',
      actionLine,
    ].join('\n');
  }

  if (job?.ping_type === 'start_reminder') {
    return [
      `CTA started for ${title}`,
      `Start time: ${startAt}`,
      'Keep the loot logger and chest logger running during the full event.',
      actionLine,
    ].join('\n');
  }

  return [
    `Submission reminder for ${title}`,
    `Submission due: ${dueAt}`,
    'Your loot log and chest log are still missing or incomplete.',
    actionLine,
  ].join('\n');
};

const syncChannelAnnouncements = async (env) => {
  const channelId = readAnnouncementChannelId(env);
  if (!channelId || !env?.DISCORD_BOT_TOKEN || !env?.LOOT_LOGVIEWER_BOT_SECRET) {
    return [];
  }

  const messages = await fetchChannelMessages(channelId, env, { limit: 25 });
  const announcements = Array.isArray(messages)
    ? [...messages].filter(shouldParseAnnouncement).sort(
      (left, right) => new Date(left.timestamp || 0) - new Date(right.timestamp || 0),
    )
    : [];

  const results = [];
  for (const message of announcements) {
    const result = await upsertDiscordAnnouncementEvent({
      message_id: message.id,
      channel_id: channelId,
      message_url: buildDiscordMessageUrl(channelId, message.id, env),
      content: message.content || '',
      created_at: message.timestamp,
    }, env);
    results.push(result);
  }

  return results;
};

const processDueReminderJobs = async (env) => {
  if (!env?.DISCORD_BOT_TOKEN || !env?.LOOT_LOGVIEWER_BOT_SECRET) {
    return [];
  }

  const jobs = await claimDueReminderJobs({
    now: new Date().toISOString(),
    limit: 30,
  }, env);

  const results = [];
  for (const job of Array.isArray(jobs) ? jobs : []) {
    try {
      const targetUserId = String(
        job?.target_discord_user_id
        || job?.assignment?.discord_user_id
        || '',
      ).trim();
      if (!targetUserId) {
        throw new Error('Target Discord user id is missing.');
      }

      await sendDirectMessage(targetUserId, {
        content: buildReminderMessage(job),
      }, env);

      await completeReminderJob({
        jobId: job.id,
        status: 'sent',
        wasLate:
          job.ping_type === 'pre_reminder'
          && new Date(job.scheduled_at || 0).getTime() < Date.now() - 60000,
      }, env);

      results.push({ id: job.id, status: 'sent' });
    } catch (error) {
      console.error(`Reminder delivery failed for job ${job?.id || 'unknown'}`, error);
      try {
        await completeReminderJob({
          jobId: job.id,
          status: 'failed',
          errorMessage: error.message || 'Reminder delivery failed.',
        }, env);
      } catch (completionError) {
        console.error(`Failed to mark reminder job ${job?.id || 'unknown'} as failed`, completionError);
      }
      results.push({ id: job?.id || 'unknown', status: 'failed' });
    }
  }

  return results;
};

const runAutomation = async (env) => {
  const announcementResults = await syncChannelAnnouncements(env);
  const reminderResults = await processDueReminderJobs(env);
  return {
    announcements: announcementResults.length,
    reminders: reminderResults.length,
  };
};

const editOriginalInteractionResponse = async (interaction, data) => {
  const response = await fetch(
    `https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(data),
    },
  );

  if (!response.ok) {
    const payload = await response.text().catch(() => '');
    throw new Error(`Failed to edit interaction response: ${response.status} ${payload}`);
  }
};

export default {
  async fetch(request, env, ctx) {
    if (request.method !== 'POST') {
      return badRequest('Only POST is supported.', 405);
    }

    const { isValid, body } = await verifyDiscordRequest(request, env.DISCORD_PUBLIC_KEY);
    if (!isValid) {
      return badRequest('invalid request signature', 401);
    }

    let interaction;
    try {
      interaction = JSON.parse(body);
    } catch {
      return badRequest('Invalid interaction payload.');
    }

    if (interaction.type === 1) {
      return json({ type: 1 });
    }

    if (interaction.type !== 2) {
      return badRequest('Unsupported interaction type.');
    }

    const commandName = interaction?.data?.name;

    if (commandName === 'balance') {
      const blocked = getBlockedChannelResponse(interaction, env);
      if (blocked) {
        return json(blocked);
      }

      ctx.waitUntil(
        (async () => {
          try {
            const data = await resolveBalanceMessageData(interaction, env, { fetchBalance });
            await editOriginalInteractionResponse(interaction, data);
          } catch (error) {
            console.error('Deferred balance command failed', error);
            await editOriginalInteractionResponse(
              interaction,
              createErrorMessageData(
                interaction,
                error.message || 'The command could not be completed.',
              ),
            ).catch((followupError) => {
              console.error('Failed to send deferred error response', followupError);
            });
          }
        })(),
      );

      return json(deferredResponse());
    }

    const handler = commandHandlers[commandName];

    if (!handler) {
      return json(createUnknownCommandResponse(interaction, commandName));
    }

    try {
      const response = await handler(interaction, env, { fetchBalance });
      return json(response);
    } catch (error) {
      console.error(`Command failed: ${commandName}`, error);
      return json({
        type: 4,
        data: createErrorMessageData(
          interaction,
          error.message || 'The command could not be completed.',
        ),
      });
    }
  },

  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(runAutomation(env));
  },
};
