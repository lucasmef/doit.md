import { connectDB } from '@clarity/db'

let connecting: Promise<void> | null = null

export async function ensureDB(): Promise<void> {
  if (!connecting) connecting = connectDB()
  await connecting
}
