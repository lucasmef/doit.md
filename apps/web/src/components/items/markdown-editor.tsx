'use client'

import { useEffect } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@tiptap/markdown'
import Placeholder from '@tiptap/extension-placeholder'

type Props = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minHeight?: string
  plain?: boolean
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Escreva em Markdown...',
  minHeight = 'min-h-[320px]',
  plain = false,
}: Props) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Markdown,
      Placeholder.configure({ placeholder }),
    ],
    content: value || '',
    contentType: 'markdown',
    editorProps: {
      attributes: {
        class: `${plain ? 'doit-note-editor' : 'prose prose-slate'} max-w-none ${minHeight} px-5 py-4 text-[15px] leading-6 outline-none focus:outline-none`,
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getMarkdown())
    },
  })

  useEffect(() => {
    if (!editor) return
    if (editor.getMarkdown() === value) return
    editor.commands.setContent(value || '', {
      emitUpdate: false,
      contentType: 'markdown',
    })
  }, [editor, value])

  return (
    <div className={`${plain ? 'h-full rounded-lg' : 'overflow-hidden rounded-xl border border-ui-border-soft'} bg-white transition-colors focus-within:border-brand-300 focus-within:ring-2 focus-within:ring-brand-100`}>
      <EditorContent editor={editor} />
    </div>
  )
}
