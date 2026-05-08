import type { AuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { UserModel } from '@doit/db'
import { ensureDB } from '@/lib/db'

const FIFTEEN_DAYS_IN_SECONDS = 15 * 24 * 60 * 60

export const authOptions: AuthOptions = {
  pages: {
    signIn: '/sign-in',
  },
  session: {
    strategy: 'jwt',
    maxAge: FIFTEEN_DAYS_IN_SECONDS,
    updateAge: 24 * 60 * 60,
  },
  jwt: {
    maxAge: FIFTEEN_DAYS_IN_SECONDS,
  },
  providers: [
    CredentialsProvider({
      name: 'Email e senha',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? '')
          .trim()
          .toLowerCase()
        const password = String(credentials?.password ?? '')
        if (!email || !password) return null

        await ensureDB()
        const user = (await UserModel.findOne({ email }).lean()) as Record<string, unknown> | null
        if (!user) return null

        const ok = await bcrypt.compare(password, String(user['passwordHash'] ?? ''))
        if (!ok) return null

        return {
          id: String(user['_id'] ?? user['id']),
          email,
          name: (user['name'] as string | undefined) ?? email,
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id
      return token
    },
    session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub
      return session
    },
  },
}
