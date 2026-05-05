import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#f5f3ef] flex flex-col items-center justify-center p-6 text-center">
      <h2 className="text-[40px] font-bold text-slate-900 mb-4">404</h2>
      <p className="text-[16px] text-slate-500 mb-8">Essa página não existe ou foi removida.</p>
      <Link href="/" className="px-6 py-3 rounded-[12px] bg-brand-600 text-white font-medium hover:bg-brand-700 transition-colors shadow-sm">
        Voltar para o Início
      </Link>
    </div>
  )
}
