import { defineEventHandler, readBody, setCookie } from 'h3'
import DiscordOAuth2 from 'discord-oauth2'
import { connectToDatabase } from '../utils/mongo'
import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { code } = body
  if (!code) return { error: 'Missing code' }
  const config = useRuntimeConfig()
  const oauth = new DiscordOAuth2({ clientId: config.discordClientId, clientSecret: config.discordClientSecret, redirectUri: config.discordRedirectUri })
  const token = await oauth.tokenRequest({ code, scope: 'identify email guilds' })
  const user = await oauth.getUser(token.access_token)
  const { db } = await connectToDatabase(config.mongoUri)
  await db.collection('users').updateOne({ id: user.id }, { $set: { ...user, token, updatedAt: new Date() } }, { upsert: true })

  // issue JWT and set HTTP-only cookie
  const jwtPayload = { id: user.id }
  const jwtToken = jwt.sign(jwtPayload, config.jwtSecret || 'devsecret', { expiresIn: '7d' })
  setCookie(event, 'session', jwtToken, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 7*24*60*60 })
  return { ok: true, user: { id: user.id, username: user.username } }
})
