const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Mevcut slash komutlarini listeler.'),

  async execute(interaction, context) {
    const commandNames = context.commands
      .map((command) => `/${command.data.name}`)
      .sort((left, right) => left.localeCompare(right));

    await interaction.reply({
      content: `Komutlar:\n${commandNames.join('\n')}`,
      ephemeral: true,
    });
  },
};
