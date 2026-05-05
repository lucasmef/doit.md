'use client'

type Props = {
  before?: string
  after?: string
  label?: string
}

function splitLines(text: string) {
  return text.split('\n')
}

export function DiffViewer({ before, after, label }: Props) {
  if (!before && !after) return null

  if (!before) {
    return (
      <div>
        {label && <p className="text-xs font-semibold text-slate-400 mb-1">{label}</p>}
        <div className="rounded-lg bg-green-50 border border-green-200 p-3 font-mono text-xs text-green-800 whitespace-pre-wrap max-h-48 overflow-y-auto">
          {after}
        </div>
      </div>
    )
  }

  if (!after) {
    return (
      <div>
        {label && <p className="text-xs font-semibold text-slate-400 mb-1">{label}</p>}
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 font-mono text-xs text-red-800 whitespace-pre-wrap line-through max-h-48 overflow-y-auto">
          {before}
        </div>
      </div>
    )
  }

  const beforeLines = splitLines(before)
  const afterLines = splitLines(after)
  const maxLen = Math.max(beforeLines.length, afterLines.length)

  const lines: { before?: string; after?: string; changed: boolean }[] = []
  for (let i = 0; i < maxLen; i++) {
    const b = beforeLines[i]
    const a = afterLines[i]
    lines.push({ before: b, after: a, changed: b !== a })
  }

  const hasChanges = lines.some((l) => l.changed)

  if (!hasChanges) {
    return (
      <div>
        {label && <p className="text-xs font-semibold text-slate-400 mb-1">{label}</p>}
        <p className="text-xs text-slate-400 italic">Sem diferenças no conteúdo.</p>
      </div>
    )
  }

  return (
    <div>
      {label && <p className="text-xs font-semibold text-slate-400 mb-2">{label}</p>}
      <div className="grid grid-cols-2 gap-1 rounded-lg overflow-hidden border border-slate-200 text-xs font-mono max-h-64 overflow-y-auto">
        {/* Header */}
        <div className="bg-red-50 px-3 py-1.5 text-red-600 font-semibold text-[10px] uppercase tracking-wider sticky top-0">
          Antes
        </div>
        <div className="bg-green-50 px-3 py-1.5 text-green-600 font-semibold text-[10px] uppercase tracking-wider sticky top-0">
          Depois
        </div>

        {/* Linhas */}
        {lines.map((line, i) => (
          <>
            <div
              key={`b-${i}`}
              className={`px-3 py-0.5 whitespace-pre-wrap break-all ${
                line.changed ? 'bg-red-50 text-red-800' : 'text-slate-600'
              }`}
            >
              {line.before ?? ''}
            </div>
            <div
              key={`a-${i}`}
              className={`px-3 py-0.5 whitespace-pre-wrap break-all ${
                line.changed ? 'bg-green-50 text-green-800' : 'text-slate-600'
              }`}
            >
              {line.after ?? ''}
            </div>
          </>
        ))}
      </div>
    </div>
  )
}
