import { defineEventHandler, getQuery } from 'h3'
import { connectToDatabase } from '../utils/mongo'
import fetch from 'node-fetch'

export default defineEventHandler(async (event) => {
  const bot = globalThis.discordBot
  if (!bot) return { error: 'Bot not ready' }

  const guilds = bot.guilds.cache.map(g => ({
    id: g.id,
    name: g.name,
    icon: g.icon
  }))

  return { guilds }
})
