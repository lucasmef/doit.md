'use client'

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen bg-[#f5f3ef] flex flex-col items-center justify-center p-6 text-center">
      <h2 className="text-[24px] font-bold text-slate-900 mb-4">Ocorreu um erro inesperado</h2>
      <p className="text-[14px] text-slate-500 mb-8 max-w-md">{error.message}</p>
      <button onClick={() => reset()} className="px-6 py-3 rounded-[12px] bg-brand-600 text-white font-medium hover:bg-brand-700 transition-colors shadow-sm">
        Tentar Novamente
      </button>
    </div>
  )
}
