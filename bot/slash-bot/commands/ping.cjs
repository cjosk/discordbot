const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Botun ayakta olup olmadigini kontrol eder.'),

  async execute(interaction) {
    await interaction.reply({
      content: 'Pong.',
      ephemeral: true,
    });
  },
};
