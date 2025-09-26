import DiscordBot from '../../client/DiscordBot'
import { connectToMongoDB } from '../../utils/mongodb'

export default defineNitroPlugin(async () => {
  if (!globalThis.discordBot) {
    await connectToMongoDB()
    const bot = new DiscordBot()
    await bot.connect()
    globalThis.discordBot = bot
    console.log(`🤖 Discord bot ready as ${bot.user?.tag}`)
  }
})
