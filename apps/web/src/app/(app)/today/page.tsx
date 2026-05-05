export default function TodayPage() {
  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold text-slate-900 mb-1">Hoje</h1>
      <p className="text-sm text-slate-500 mb-6 capitalize">{today}</p>

      <section className="mb-6">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Tarefas
        </h2>
        <div className="rounded-xl border border-slate-200 bg-surface p-4 text-sm text-slate-500">
          Nenhuma tarefa para hoje.
        </div>
      </section>

      <section>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Eventos
        </h2>
        <div className="rounded-xl border border-slate-200 bg-surface p-4 text-sm text-slate-500">
          Nenhum evento hoje.
        </div>
      </section>
    </div>
  )
}
