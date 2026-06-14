export const EPHEMERAL_FLAG = 64;

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

export const commandHandlers = {
  ping: async () => jsonResponse('Pong.'),

  help: async () => {
    const commandNames = discordCommands
      .map((command) => `/${command.name}`)
      .sort((left, right) => left.localeCompare(right));

    return jsonResponse(`Komutlar:\n${commandNames.join('\n')}`);
  },

  balance: async (interaction, env, { fetchBalance }) => {
    const discordId = interaction?.member?.user?.id || interaction?.user?.id;

    if (!discordId) {
      return jsonResponse('Discord kullanicisi okunamadi.');
    }

    const balance = await fetchBalance(discordId, env);

    if (!balance?.playerId) {
      return jsonResponse(
        balance?.message || 'Discord hesabin sitede bir karaktere bagli degil.',
      );
    }

    return jsonResponse(
      `${balance.playerName}: ${balance.balanceFormatted || '0'} Silver`,
    );
  },
};
