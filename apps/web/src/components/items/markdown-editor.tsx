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
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Escreva em Markdown...',
  minHeight = 'min-h-[320px]',
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
        class: `prose prose-slate max-w-none ${minHeight} px-5 py-4 text-[15px] leading-7 outline-none focus:outline-none`,
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
    <div className="overflow-hidden rounded-xl border border-ui-border-soft bg-white transition-colors focus-within:border-brand-300 focus-within:ring-2 focus-within:ring-brand-100">
      <EditorContent editor={editor} />
    </div>
  )
}
