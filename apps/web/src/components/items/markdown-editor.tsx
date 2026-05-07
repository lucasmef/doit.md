'use client'

type Props = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function MarkdownEditor({ value, onChange, placeholder = 'Escreva em Markdown...' }: Props) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      spellCheck
      className="min-h-[260px] w-full resize-y rounded-xl border border-ui-border-soft bg-white px-4 py-3 font-sans text-[15px] leading-7 text-slate-800 outline-none transition-colors placeholder:text-slate-300 focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
    />
  )
}
