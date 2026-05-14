const { REST, Routes } = require('discord.js');

const { config, requireConfig } = require('./src/config.cjs');
const { loadCommandModules } = require('./src/utils/load-commands.cjs');

const main = async () => {
  requireConfig('token', 'clientId', 'guildId');

  const commands = loadCommandModules().map((command) => command.data.toJSON());
  const rest = new REST({ version: '10' }).setToken(config.token);

  await rest.put(
    Routes.applicationGuildCommands(config.clientId, config.guildId),
    { body: commands },
  );

  console.log(`Registered ${commands.length} slash commands to guild ${config.guildId}.`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
