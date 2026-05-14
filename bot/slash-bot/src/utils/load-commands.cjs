const fs = require('fs');
const path = require('path');

const commandsPath = path.join(__dirname, '..', '..', 'commands');

const loadCommandModules = () =>
  fs.readdirSync(commandsPath)
    .filter((file) => file.endsWith('.cjs'))
    .map((file) => {
      const command = require(path.join(commandsPath, file));
      if (!command?.data?.name || typeof command.execute !== 'function') {
        throw new Error(`Invalid command module: ${file}`);
      }
      return command;
    });

module.exports = {
  loadCommandModules,
};
