export default {
  modules: ['@nuxtjs/tailwindcss'],
  compatibilityDate: '2025-09-17',
  runtimeConfig: {
    discordClientId: process.env.DISCORD_CLIENT_ID,       // server-only
    discordClientSecret: process.env.DISCORD_CLIENT_SECRET, // server-only
    discordRedirectUri: process.env.DISCORD_REDIRECT_URI, // server-only
    public: {
      discordClientId: process.env.DISCORD_CLIENT_ID,     // client-side
      discordRedirectUri: process.env.DISCORD_REDIRECT_URI // client-side
    }
  },
}
