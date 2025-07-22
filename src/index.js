require('dotenv').config();
const express = require('express');
const DiscordBot = require('./client/DiscordBot');
const { connectToMongoDB } = require('./utils/mongodb');
const { success, error, warn } = require('./utils/Console');

const PORT = process.env.PORT || 3000;
let shuttingDown = false;

const bot = new DiscordBot();
const app = express();
let httpServer = null;

// Error & signal handlers
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
process.on('unhandledRejection', (reason) => error('Unhandled Rejection:', reason));
process.on('uncaughtException', (err) => error('Uncaught Exception:', err));

// Startup sequence
(async () => {
    try {
        await connectToMongoDB();

        await bot.connect();
        success(`🤖 Discord bot connected as ${bot.user?.tag || 'unknown'}`);

        // HTTP endpoints
        app.get('/', (req, res) => {
            const status = bot?.ws?.status === 0 ? '🟢 ONLINE' : '🔴 OFFLINE';
            const tag = bot?.user?.tag || 'Unknown';
            res.status(200).send(`
                <html>
                    <head><title>Bot Status</title></head>
                    <body style="font-family:sans-serif; background:#2c2f33; color:white; text-align:center; padding:50px;">
                        <h1>🤖 ${tag}</h1>
                        <h2>Status: ${status}</h2>
                    </body>
                </html>
            `);
        });

        app.get('/health', (req, res) => res.status(200).send('OK'));

        httpServer = app.listen(PORT, () => {
            success(`🌐 HTTP server running on port ${PORT}`);
        });

    } catch (err) {
        error('💥 Fatal startup failure:', err);
        await shutdown(1);
    }
})();

// Graceful shutdown
async function shutdown(code) {
    if (shuttingDown) return;
    shuttingDown = true;

    warn('🛑 Shutting down...');

    try {
        if (bot?.ws?.status === 0) {
            await bot.destroy();
            warn('Bot disconnected.');
        } else {
            warn('Bot already disconnected.');
        }

        if (httpServer) {
            await new Promise(resolve => httpServer.close(resolve));
            warn('HTTP server stopped.');
        }

    } catch (e) {
        error('Shutdown error:', e);
    } finally {
        const exitCode = typeof code === 'number' ? code : 0;
        warn(`Process exiting with code ${exitCode}`);
        process.exit(exitCode);
    }
}
