import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/auth'
import { SignUpForm } from './sign-up-form'

export default async function SignUpPage() {
  const session = await getServerSession(authOptions)
  if (session?.user) redirect('/today')

  return <SignUpForm />
}
