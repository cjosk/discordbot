const { ActivityType, Client, Collection, Events, GatewayIntentBits } = require('discord.js');

const { config, requireConfig } = require('./src/config.cjs');
const { loadCommandModules } = require('./src/utils/load-commands.cjs');

requireConfig('token');

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const commands = loadCommandModules();
client.commands = new Collection(commands.map((command) => [command.data.name, command]));

client.once(Events.ClientReady, (readyClient) => {
  readyClient.user.setPresence({
    activities: [{ name: 'Supremacy HQ Slash Bot', type: ActivityType.Playing }],
    status: 'online',
  });

  console.log(`Slash bot online: ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction, { client, commands });
  } catch (error) {
    console.error(`Command failed: ${interaction.commandName}`, error);

    const payload = {
      content: `Hata: ${error.message || 'Komut calistirilamadi.'}`,
      ephemeral: true,
    };

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(payload);
      return;
    }

    await interaction.reply(payload);
  }
});

client.login(config.token);
