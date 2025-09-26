import { defineEventHandler, getQuery } from 'h3'

// This endpoint simply renders a tiny HTML page that posts the code to /api/auth
export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const code = q.code as string || ''
  return `<!doctype html><html><body><script>fetch('/api/auth',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code})}).then(()=>{window.location='/'})</script></body></html>`
})
