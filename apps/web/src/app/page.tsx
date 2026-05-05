import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'

export default async function HomePage() {
  const { userId } = await auth()
  if (userId) redirect('/today')

  return (
    <div className="min-h-screen bg-[#f5f3ef] flex flex-col items-center justify-center p-6 selection:bg-brand-200">
      <div className="max-w-md w-full bg-white rounded-[24px] p-8 md:p-12 shadow-sm border border-[#e7e1d8] text-center">
        <div className="w-16 h-16 bg-brand-100 text-brand-600 rounded-[16px] flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-[32px] font-bold text-slate-900 mb-4">Clarity</h1>
        <p className="text-[15px] text-slate-500 mb-8 leading-relaxed">
          O seu cérebro digital unificado. Gerencie tarefas, projetos, anotações e seu calendário em um só lugar.
        </p>
        <Link
          href="/sign-in"
          className="block w-full py-3.5 px-4 rounded-[12px] bg-brand-600 text-white font-semibold hover:bg-brand-700 transition-colors shadow-sm mb-4"
        >
          Acessar minha conta
        </Link>
        <p className="text-[13px] text-slate-400 font-medium">
          Ainda não tem conta? <Link href="/sign-up" className="text-brand-600 hover:text-brand-700">Cadastre-se</Link>
        </p>
      </div>
    </div>
  )
}
