import { commandHandlers } from './src/commands.mjs';
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

export default {
  async fetch(request, env) {
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
    const handler = commandHandlers[commandName];

    if (!handler) {
      return json({
        type: 4,
        data: {
          content: `Bilinmeyen komut: ${commandName || 'unknown'}`,
          flags: 64,
        },
      });
    }

    try {
      const response = await handler(interaction, env, { fetchBalance });
      return json(response);
    } catch (error) {
      console.error(`Command failed: ${commandName}`, error);
      return json({
        type: 4,
        data: {
          content: `Hata: ${error.message || 'Komut calistirilamadi.'}`,
          flags: 64,
        },
      });
    }
  },
};
