import { connectDB } from '@doit/db'

let connecting: Promise<void> | null = null

export async function ensureDB(): Promise<void> {
  if (!connecting) connecting = connectDB()
  try {
    await connecting
  } catch (err) {
    connecting = null
    throw err
  }
}
