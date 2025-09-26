import { defineEventHandler, readBody } from 'h3'
import { connectToDatabase } from '../utils/mongo'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { guildId, settings } = body || {}
  if (!guildId) return { error: 'guildId required' }
  const { db } = await connectToDatabase(useRuntimeConfig().mongoUri)
  await db.collection('settings').updateOne({ guildId }, { $set: { settings, updatedAt: new Date() } }, { upsert: true })
  return { ok: true }
})
