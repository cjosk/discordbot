import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';

import { discordCommands } from './src/commands.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const readEnv = (key) => String(process.env[key] || '').trim();

const config = {
  token: readEnv('DISCORD_BOT_TOKEN'),
  applicationId: readEnv('DISCORD_APPLICATION_ID'),
  guildId: readEnv('DISCORD_GUILD_ID'),
};

const missing = Object.entries({
  DISCORD_BOT_TOKEN: config.token,
  DISCORD_APPLICATION_ID: config.applicationId,
}).filter(([, value]) => !value);

if (missing.length > 0) {
  throw new Error(`Missing required config: ${missing.map(([key]) => key).join(', ')}`);
}

const endpoint = config.guildId
  ? `https://discord.com/api/v10/applications/${config.applicationId}/guilds/${config.guildId}/commands`
  : `https://discord.com/api/v10/applications/${config.applicationId}/commands`;

const response = await fetch(endpoint, {
  method: 'PUT',
  headers: {
    Authorization: `Bot ${config.token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(discordCommands),
});

const payload = await response.json().catch(() => ({}));

if (!response.ok) {
  throw new Error(payload?.message || 'Failed to register slash commands.');
}

console.log(
  `Registered ${discordCommands.length} slash commands to ${config.guildId || 'global scope'}.`,
);
