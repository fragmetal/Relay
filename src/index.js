require('dotenv').config();
const DiscordBot = require('./client/DiscordBot');
const { connectToMongoDB } = require('./utils/mongodb');
const { success, error, warn } = require('./utils/Console');

let shuttingDown = false;
const bot = new DiscordBot();

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
  } catch (e) {
    error('Shutdown error:', e);
  } finally {
    const exitCode = typeof code === 'number' ? code : 0;
    warn(`Process exiting with code ${exitCode}`);
    process.exit(exitCode);
  }
}
