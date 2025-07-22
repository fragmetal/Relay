require('dotenv').config();
const express = require('express');
const DiscordBot = require('./client/DiscordBot');
const { connectToMongoDB } = require('./utils/mongodb');
const { success, error, warn } = require('./utils/Console');

// Instantiate app
const app = express();
const PORT = process.env.PORT || 3000;

// Basic keep-alive and health endpoints
app.get('/', (req, res) => res.status(200).send('OK'));
app.get('/health', (req, res) => res.status(200).send('OK'));

// Start HTTP server immediately (for platform health checks)
app.listen(PORT, () => {
    success(`🌐 Keep-alive HTTP server running on port ${PORT}`);
});

// Initialize Discord Bot
(async () => {
    try {
        await connectToMongoDB();
        const client = new DiscordBot();
        await client.connect();
        success(`🤖 Discord bot connected as ${client.user?.tag || 'unknown'}`);
    } catch (err) {
        error('💥 Bot initialization failed:', err);
        process.exit(1);
    }
})();

// Graceful shutdown handler
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

async function shutdown() {
    warn('🛑 Shutting down services...');
    try {
        await client?.destroy();
        warn('Discord bot disconnected.');
        process.exit(0);
    } catch (e) {
        error('Failed graceful shutdown:', e);
        process.exit(1);
    }
}
