import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/labelforge'

declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null }
}

if (!global._mongooseCache) {
  global._mongooseCache = { conn: null, promise: null }
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (global._mongooseCache.conn) return global._mongooseCache.conn

  if (!global._mongooseCache.promise) {
    global._mongooseCache.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      socketTimeoutMS: 10000,
    }).catch((err) => {
      // Clear so the next request retries instead of re-awaiting the failed promise
      global._mongooseCache.promise = null
      throw err
    })
  }

  try {
    global._mongooseCache.conn = await global._mongooseCache.promise
  } catch (err) {
    global._mongooseCache.promise = null
    throw err
  }

  return global._mongooseCache.conn
}
