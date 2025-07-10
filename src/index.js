require('dotenv').config();
const express = require('express');
const axios = require('axios');
const DiscordBot = require('./client/DiscordBot');
const { connectToMongoDB } = require('./utils/mongodb');

const app = express();
const client = new DiscordBot();

// Add these to your .env file
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || 'http://localhost:3000/api/auth/callback/discord';

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize status tracking
let serverStatus = {
    botConnected: false,
    botReadyAt: null,
    serverListening: false,
    botName: 'Discord Bot' // Default name
};

// Middleware with safe status check
app.use((req, res, next) => {
  const status = serverStatus.botConnected 
      ? `✅ Online since ${serverStatus.botReadyAt.toLocaleString()}`
      : '🔴 Connecting...';
  
  res.locals.botStatus = status;
  next();
});

app.get('/', (req, res) => {
    res.send(`
        <html>
        <head>
            <title>${serverStatus.botName || 'Discord Bot'} Status</title>
            <style>
                body {
                    margin: 0;
                    min-height: 100vh;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    background-color: #36393f;
                    color: #ffffff;
                    font-family: 'Arial', sans-serif;
                }
                .status-container {
                    text-align: center;
                    max-width: 600px;
                    padding: 20px;
                }
                .title {
                    font-size: 2.5em;
                    color: #7289da;
                    margin-bottom: 30px;
                    text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
                }
                .status-box {
                    padding: 40px 60px;
                    background: #2f3136;
                    border-radius: 10px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                }
                .online { color: #43b581; }
                .offline { color: #f04747; }
                .status-text {
                    margin: 15px 0;
                    font-size: 1.2em;
                }
            </style>
        </head>
        <body>
            <div class="status-container">
                <h1 class="title">${serverStatus.botName || 'Discord Bot'} Status Monitor</h1>
                <div class="status-box ${serverStatus.botConnected ? 'online' : 'offline'}">
                    <div class="status-text">
                        <h2>🤖 Bot Status</h2>
                        <p>${res.locals.botStatus}</p>
                    </div>
                    <div class="status-text">
                        <h2>🌐 Server Status</h2>
                        <p>${serverStatus.serverListening ? '🟢 Operational' : '🔴 Initializing'}</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `);
});

app.get('/api/auth/callback/discord', async (req, res) => {
    try {
      const { code, error } = req.query;
  
      // Handle errors from Discord
      if (error) {
        return res.status(401).send(`Error: ${error}`);
      }
  
      // Verify authorization code exists
      if (!code) {
        return res.status(400).send('Missing authorization code');
      }
  
      // Exchange code for access token (CORRECT ENDPOINT)
      const tokenResponse = await axios.post(
        'https://discord.com/api/oauth2/token', // Correct endpoint
        new URLSearchParams({
          client_id: DISCORD_CLIENT_ID,
          client_secret: DISCORD_CLIENT_SECRET,
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: DISCORD_REDIRECT_URI,
          scope: 'identify'
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
  
      // Get user data
      const userResponse = await axios.get('https://discord.com/api/users/@me', {
        headers: {
          Authorization: `Bearer ${tokenResponse.data.access_token}`
        }
      });
  
      // Successful response
      res.json({
        success: true,
        user: userResponse.data,
        application_id: DISCORD_CLIENT_ID
      });
  
    } catch (error) {
      console.error('Full error details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      res.status(500).json({
        error: 'Authentication failed',
        details: error.response?.data || error.message
      });
    }
  });

// Initialize services
(async () => {
  try {
    await connectToMongoDB();
    
    // Listen for bot connection events
    client.on('ready', () => {
        serverStatus.botConnected = true;
        serverStatus.botReadyAt = new Date();
        serverStatus.botName = client.user.tag;
    });

    client.on('disconnect', () => {
        serverStatus.botConnected = false;
    });

    // Start bot connection
    client.connect();

    // Start HTTP server AFTER initiating bot connection
    const PORT = process.env.PORT || 3000;
    const server = app.listen(PORT, () => {
        serverStatus.serverListening = true;
        console.log(`Server is running on port ${PORT}`);
    });

  } catch (error) {
    console.error('💥 Initialization failed:', error);
    process.exit(1);
  }
})();

// Error handling and cleanup
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

async function gracefulShutdown() {
    console.log('🛑 Shutting down...');
    process.exit(0);
}

module.exports = { app, serverStatus };