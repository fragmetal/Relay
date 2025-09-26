import { MongoClient, Db } from 'mongodb'

let cachedClient: MongoClient | null = null
let cachedDb: Db | null = null

export async function connectToDatabase(uri: string) {
  if (cachedClient && cachedDb) return { client: cachedClient, db: cachedDb }
  const client = new MongoClient(uri)
  await client.connect()
  const db = client.db()
  cachedClient = client
  cachedDb = db
  return { client, db }
}
