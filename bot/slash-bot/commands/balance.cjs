const { SlashCommandBuilder } = require('discord.js');
const { fetchBalance } = require('../src/utils/balance-api.cjs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Bagli karakterinin mevcut silver bakiyesini gosterir.'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const balance = await fetchBalance(interaction.user.id);

    if (!balance?.playerId) {
      await interaction.editReply(
        balance?.message || 'Discord hesabin sitede bir karaktere bagli degil.',
      );
      return;
    }

    await interaction.editReply(
      `${balance.playerName}: ${balance.balanceFormatted || '0'} Silver`,
    );
  },
};
