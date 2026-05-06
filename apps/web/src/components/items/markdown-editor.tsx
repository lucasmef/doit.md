'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type Props = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function MarkdownEditor({ value, onChange, placeholder = 'Escreva em Markdown...' }: Props) {
  return (
    <div className="grid gap-3">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-[180px] w-full resize-y rounded-xl border border-ui-border-soft bg-white px-4 py-3 text-[15px] leading-7 text-slate-800 outline-none transition-colors placeholder:text-slate-300 focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
      />
      <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3">
        {value.trim() ? (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => <h1 className="mb-3 text-2xl font-bold text-slate-900"># {children}</h1>,
              h2: ({ children }) => <h2 className="mb-2 text-xl font-bold text-slate-900">## {children}</h2>,
              h3: ({ children }) => <h3 className="mb-2 text-lg font-semibold text-slate-900">### {children}</h3>,
              p: ({ children }) => <p className="mb-3 text-[15px] leading-7 text-slate-700">{children}</p>,
              ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5 text-[15px] leading-7 text-slate-700">{children}</ul>,
              ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5 text-[15px] leading-7 text-slate-700">{children}</ol>,
              blockquote: ({ children }) => <blockquote className="mb-3 border-l-4 border-brand-200 pl-3 text-slate-600">{children}</blockquote>,
              code: ({ children }) => <code className="rounded bg-slate-200 px-1 py-0.5 text-[13px] text-slate-800">{children}</code>,
              pre: ({ children }) => <pre className="mb-3 overflow-x-auto rounded-lg bg-slate-900 p-3 text-sm text-slate-100">{children}</pre>,
            }}
          >
            {value}
          </ReactMarkdown>
        ) : (
          <p className="text-[14px] text-slate-300">{placeholder}</p>
        )}
      </div>
    </div>
  )
}
