require('dotenv').config();
const DiscordBot = require('./client/DiscordBot');
const HttpServer = require('./server/HttpServer');
const { connectToMongoDB } = require('./utils/mongodb');
const { success, error, warn } = require('./utils/Console');

let shuttingDown = false;

const bot = new DiscordBot();
const server = new HttpServer(process.env.PORT || 3000);

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

process.on('unhandledRejection', (reason) => {
    error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
    error('Uncaught Exception:', err);
});

(async () => {
    try {
        await connectToMongoDB();
        server.start();
        await bot.connect();
        success(`🤖 Discord bot connected as ${bot.user?.tag || 'unknown'}`);
    } catch (err) {
        error('💥 Fatal startup failure:', err);
        await shutdown(1);
    }
})();

async function shutdown(code) {
    if (shuttingDown) return;
    shuttingDown = true;

    try {
        if (bot?.ws?.status !== 0) {
            await bot.destroy();
            warn('Bot disconnected.');
        } else {
            warn('Bot already disconnected.');
        }

        await server?.stop();
        warn('HTTP server stopped.');
    } catch (e) {
        error('Shutdown error:', e);
    } finally {
        const exitCode = typeof code === 'number' ? code : 0;
        warn(`Process exiting with code ${exitCode}`);
        process.exit(exitCode);
    }
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

