require('dotenv').config();
const fs = require('fs');
const DiscordBot = require('./client/DiscordBot');
const { connectToMongoDB } = require('./utils/mongodb');
const logFilePath = './terminal.log';

fs.writeFileSync(logFilePath, '', 'utf-8');

const client = new DiscordBot();

(async () => {
    await connectToMongoDB();
    client.connect();
})();

module.exports = client;

process.on('unhandledRejection', console.error);
process.on('uncaughtException', console.error);