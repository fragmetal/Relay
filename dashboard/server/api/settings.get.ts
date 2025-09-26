import { defineEventHandler, getQuery } from 'h3'
import { connectToDatabase } from '../utils/mongo'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const guildId = q.guildId as string
  if (!guildId) return { error: 'guildId required' }
  const { db } = await connectToDatabase(useRuntimeConfig().mongoUri)
  const doc = await db.collection('settings').findOne({ guildId })
  return { settings: doc?.settings || {} }
})
