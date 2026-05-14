const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const readEnv = (key) => String(process.env[key] || '').trim();

const config = {
  token: readEnv('DISCORD_BOT_TOKEN'),
  clientId: readEnv('DISCORD_CLIENT_ID'),
  guildId: readEnv('DISCORD_GUILD_ID'),
  balanceApiUrl: readEnv('BALANCE_API_URL') || 'https://teamsupremacyhq.vercel.app/api/discord-balance',
};

const requireConfig = (...keys) => {
  for (const key of keys) {
    if (!config[key]) {
      throw new Error(`Missing required config: ${key}`);
    }
  }
};

module.exports = {
  config,
  requireConfig,
};
