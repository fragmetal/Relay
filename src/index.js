require('dotenv').config();
const express = require('express');
const DiscordBot = require('./client/DiscordBot');
const { connectToMongoDB } = require('./utils/mongodb');
const { success, error, warn } = require('./utils/Console');

let shuttingDown = false;
const bot = new DiscordBot();

// -------------------------
// Express HTTP server
// -------------------------
const app = express();

// Simple healthcheck endpoint
app.get('/', (req, res) => {
  res.json({ status: 'ok', bot: bot.user?.tag || null });
});

// Optional: add a /shutdown endpoint (use carefully!)
app.post('/shutdown', async (req, res) => {
  res.json({ message: 'Shutdown initiated' });
  await shutdown(0);
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  success(`🌐 HTTP server listening on port ${PORT}`);
});

// -------------------------
// Error & signal handlers
// -------------------------
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
process.on('unhandledRejection', (reason) => error('Unhandled Rejection:', reason));
process.on('uncaughtException', (err) => error('Uncaught Exception:', err));

// -------------------------
// Startup sequence
// -------------------------
(async () => {
  try {
    await connectToMongoDB();
    await bot.connect();
    success(`🤖 Discord bot connected as ${bot.user?.tag || 'unknown'}`);
  } catch (err) {
    error('💥 Fatal startup failure:', err);
    await shutdown(1);
  }
})();

// -------------------------
// Graceful shutdown
// -------------------------
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
  } catch (e) {
    error('Shutdown error:', e);
  } finally {
    const exitCode = typeof code === 'number' ? code : 0;
    warn(`Process exiting with code ${exitCode}`);
    process.exit(exitCode);
  }
}
