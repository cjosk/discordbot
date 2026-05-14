export const EPHEMERAL_FLAG = 64;
export const DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE = 5;

const readAllowedChannelId = (env) => String(env?.DISCORD_ALLOWED_CHANNEL_ID || '').trim();

export const discordCommands = [
  {
    name: 'ping',
    description: 'Botun ayakta olup olmadigini kontrol eder.',
  },
  {
    name: 'help',
    description: 'Mevcut slash komutlarini listeler.',
  },
  {
    name: 'balance',
    description: 'Bagli karakterinin mevcut silver bakiyesini gosterir.',
  },
];

const jsonResponse = (content) => ({
  type: 4,
  data: {
    content,
    flags: EPHEMERAL_FLAG,
  },
});

export const deferredResponse = () => ({
  type: DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
  data: {
    flags: EPHEMERAL_FLAG,
  },
});

const requireAllowedChannel = (interaction, env) => {
  const allowedChannelId = readAllowedChannelId(env);
  if (!allowedChannelId) return null;

  const currentChannelId = String(interaction?.channel_id || '').trim();
  if (currentChannelId === allowedChannelId) return null;

  return jsonResponse('Bu komut sadece belirli kanalda kullanilabilir.');
};

export const getBlockedChannelResponse = requireAllowedChannel;

export const resolveBalanceMessage = async (interaction, env, { fetchBalance }) => {
  const blocked = requireAllowedChannel(interaction, env);
  if (blocked) {
    return blocked.data.content;
  }

  const discordId = interaction?.member?.user?.id || interaction?.user?.id;

  if (!discordId) {
    return 'Discord kullanicisi okunamadi.';
  }

  const balance = await fetchBalance(discordId, env);

  if (!balance?.playerId) {
    return balance?.message || 'Discord hesabin sitede bir karaktere bagli degil.';
  }

  return `${balance.playerName}: ${balance.balanceFormatted || '0'} Silver`;
};

export const commandHandlers = {
  ping: async (interaction, env) => {
    const blocked = requireAllowedChannel(interaction, env);
    if (blocked) return blocked;
    return jsonResponse('Pong.');
  },

  help: async (interaction, env) => {
    const blocked = requireAllowedChannel(interaction, env);
    if (blocked) return blocked;

    const commandNames = discordCommands
      .map((command) => `/${command.name}`)
      .sort((left, right) => left.localeCompare(right));

    return jsonResponse(`Komutlar:\n${commandNames.join('\n')}`);
  },

  balance: async (interaction, env, { fetchBalance }) => {
    const message = await resolveBalanceMessage(interaction, env, { fetchBalance });
    return jsonResponse(message);
  },
};
