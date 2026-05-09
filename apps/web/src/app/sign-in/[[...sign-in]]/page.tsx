import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/auth'
import { SignInForm } from './sign-in-form'

export default async function SignInPage() {
  const session = await getServerSession(authOptions)
  if (session?.user) redirect('/today')

  return <SignInForm />
}
