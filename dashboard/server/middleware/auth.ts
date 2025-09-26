import { defineEventHandler, getHeader } from 'h3'
import jwt from 'jsonwebtoken'
import { useRuntimeConfig } from '#imports'

export default defineEventHandler(async (event) => {
  // This middleware is illustrative. In Nuxt 3 you can use useNuxtServerInit patterns.
  const cookie = event.node.req.headers.cookie || ''
  const match = cookie.match(/session=([^;]+)/)
  if (!match) return
  try {
    const token = match[1]
    const payload = jwt.verify(token, useRuntimeConfig().jwtSecret || 'devsecret')
    // attach to event.context
    // @ts-ignore
    event.context.auth = payload
  } catch (e) {
    // ignore invalid
  }
})
