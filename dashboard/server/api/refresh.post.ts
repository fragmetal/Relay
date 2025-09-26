import { defineEventHandler, setCookie, readBody } from 'h3'
import jwt from 'jsonwebtoken'
import { connectToDatabase } from '../utils/mongo'
import DiscordOAuth2 from 'discord-oauth2'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { userId } = body || {}
  const config = useRuntimeConfig()
  if (!userId) return { error: 'userId required' }
  const { db } = await connectToDatabase(config.mongoUri)
  const user = await db.collection('users').findOne({ id: userId })
  if (!user) return { error: 'user not found' }
  // Attempt to refresh using stored refresh_token
  try {
    const oauth = new DiscordOAuth2({ clientId: config.discordClientId, clientSecret: config.discordClientSecret, redirectUri: config.discordRedirectUri })
    const refreshed = await oauth.tokenRequest({ grantType: 'refresh_token', refreshToken: user.token.refresh_token })
    await db.collection('users').updateOne({ id: userId }, { $set: { 'token': refreshed, updatedAt: new Date() } })
    const jwtToken = jwt.sign({ id: userId }, config.jwtSecret || 'devsecret', { expiresIn: '7d' })
    setCookie(event, 'session', jwtToken, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 7*24*60*60 })
    return { ok: true }
  } catch (err) {
    return { error: 'refresh failed', details: String(err) }
  }
})
