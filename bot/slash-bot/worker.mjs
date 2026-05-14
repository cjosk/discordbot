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

const json = (payload, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });

const badRequest = (message, status = 400) => json({ error: message }, status);

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
};
