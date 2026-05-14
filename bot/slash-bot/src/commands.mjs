export const EPHEMERAL_FLAG = 64;
export const DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE = 5;

const EMBED_COLORS = {
  neutral: 0xf5f5f4,
  success: 0xfacc15,
  info: 0x60a5fa,
  error: 0xf87171,
};

const readAllowedChannelId = (env) => String(env?.DISCORD_ALLOWED_CHANNEL_ID || '').trim();

export const discordCommands = [
  {
    name: 'ping',
    description: 'Check whether the bot is online.',
  },
  {
    name: 'help',
    description: 'Show the available slash commands.',
  },
  {
    name: 'balance',
    description: 'Show the silver balance of your linked character.',
  },
];

const getDiscordUser = (interaction) => interaction?.member?.user || interaction?.user || null;

const getAvatarUrl = (interaction) => {
  const user = getDiscordUser(interaction);
  if (!user?.id) return null;

  if (user.avatar) {
    const extension = user.avatar.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${extension}?size=256`;
  }

  const discriminator = Number.parseInt(user.discriminator || '0', 10);
  const defaultIndex = Number.isNaN(discriminator) ? 0 : discriminator % 5;
  return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
};

const buildEmbed = (interaction, { color, title, description, fields = [] }) => {
  const user = getDiscordUser(interaction);
  const thumbnailUrl = getAvatarUrl(interaction);

  return {
    color,
    title,
    description,
    fields,
    thumbnail: thumbnailUrl ? { url: thumbnailUrl } : undefined,
    author: user?.username
      ? {
          name: user.username,
        }
      : undefined,
    footer: {
      text: 'Supremacy Bot',
    },
    timestamp: new Date().toISOString(),
  };
};

const createMessageData = (interaction, embed) => ({
  flags: EPHEMERAL_FLAG,
  embeds: [embed],
});

const createMessageResponse = (interaction, embed) => ({
  type: 4,
  data: createMessageData(interaction, embed),
});

export const deferredResponse = () => ({
  type: DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
  data: {
    flags: EPHEMERAL_FLAG,
  },
});

const createBlockedChannelResponse = (interaction, env) => {
  const allowedChannelId = readAllowedChannelId(env);
  if (!allowedChannelId) return null;

  const currentChannelId = String(interaction?.channel_id || '').trim();
  if (currentChannelId === allowedChannelId) return null;

  return createMessageResponse(
    interaction,
    buildEmbed(interaction, {
      color: EMBED_COLORS.error,
      title: 'Wrong Channel',
      description: `Use this command only in <#${allowedChannelId}>.`,
    }),
  );
};

export const getBlockedChannelResponse = createBlockedChannelResponse;

export const createErrorMessageData = (interaction, message) =>
  createMessageData(
    interaction,
    buildEmbed(interaction, {
      color: EMBED_COLORS.error,
      title: 'Request Failed',
      description: message || 'The command could not be completed.',
    }),
  );

export const createUnknownCommandResponse = (interaction, commandName) =>
  createMessageResponse(
    interaction,
    buildEmbed(interaction, {
      color: EMBED_COLORS.error,
      title: 'Unknown Command',
      description: `The command \`/${commandName || 'unknown'}\` is not registered.`,
    }),
  );

export const resolveBalanceMessageData = async (interaction, env, { fetchBalance }) => {
  const blocked = createBlockedChannelResponse(interaction, env);
  if (blocked) {
    return blocked.data;
  }

  const discordId = getDiscordUser(interaction)?.id;
  if (!discordId) {
    return createErrorMessageData(interaction, 'Could not read the Discord user.');
  }

  const balance = await fetchBalance(discordId, env);

  if (!balance?.playerId) {
    return createErrorMessageData(
      interaction,
      balance?.message || 'Your Discord account is not linked to a character on the site.',
    );
  }

  return createMessageData(
    interaction,
    buildEmbed(interaction, {
      color: EMBED_COLORS.success,
      title: 'Silver Balance',
      description: 'Your linked character balance is ready.',
      fields: [
        {
          name: 'Character',
          value: balance.playerName || 'Unknown',
          inline: true,
        },
        {
          name: 'Balance',
          value: `${balance.balanceFormatted || '0'} Silver`,
          inline: true,
        },
      ],
    }),
  );
};

export const commandHandlers = {
  ping: async (interaction, env) => {
    const blocked = createBlockedChannelResponse(interaction, env);
    if (blocked) return blocked;

    return createMessageResponse(
      interaction,
      buildEmbed(interaction, {
        color: EMBED_COLORS.info,
        title: 'Bot Online',
        description: 'Supremacy Bot is up and responding normally.',
      }),
    );
  },

  help: async (interaction, env) => {
    const blocked = createBlockedChannelResponse(interaction, env);
    if (blocked) return blocked;

    return createMessageResponse(
      interaction,
      buildEmbed(interaction, {
        color: EMBED_COLORS.neutral,
        title: 'Available Commands',
        description: 'Use one of the commands below.',
        fields: discordCommands.map((command) => ({
          name: `/${command.name}`,
          value: command.description,
          inline: false,
        })),
      }),
    );
  },

  balance: async (interaction, env, { fetchBalance }) => ({
    type: 4,
    data: await resolveBalanceMessageData(interaction, env, { fetchBalance }),
  }),
};
