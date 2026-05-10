'use client'

import { useEffect } from 'react'
import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@tiptap/markdown'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import { TaskList } from '@tiptap/extension-task-list'
import { TaskItem } from '@tiptap/extension-task-item'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableHeader } from '@tiptap/extension-table-header'
import { TableCell } from '@tiptap/extension-table-cell'
import { useDialog } from '@/components/ui/dialog'
import { BlockReorderHandle } from './block-reorder-extension'

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
      Link.configure({
        openOnClick: false,
        autolink: true,
        protocols: ['http', 'https', 'mailto'],
        HTMLAttributes: {
          rel: 'noopener noreferrer nofollow',
          target: '_blank',
        },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      BlockReorderHandle,
    ],
    content: value || '',
    contentType: 'markdown',
    editorProps: {
      attributes: {
        class: `${plain ? 'doit-note-editor' : 'prose prose-slate'} max-w-none ${minHeight} pl-9 pr-5 py-4 text-[15px] leading-6 outline-none focus:outline-none`,
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
    <div
      className={`${
        plain ? 'flex h-full flex-col rounded-lg' : 'flex flex-col overflow-hidden rounded-xl border border-ui-border-soft'
      } bg-white transition-colors focus-within:border-brand-300 focus-within:ring-2 focus-within:ring-brand-100`}
    >
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} className="flex-1 overflow-auto" />
    </div>
  )
}

type ToolbarBtnProps = {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
}

function ToolbarBtn({ onClick, active, disabled, title, children }: ToolbarBtnProps) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors ${
        active
          ? 'bg-brand-100 text-brand-700'
          : 'text-ui-text-muted hover:bg-ui-fill-subtle hover:text-ui-text'
      } disabled:cursor-not-allowed disabled:opacity-40`}
    >
      {children}
    </button>
  )
}

function ToolbarSep() {
  return <span className="mx-0.5 h-5 w-px bg-ui-border-soft" />
}

function EditorToolbar({ editor }: { editor: Editor | null }) {
  const { prompt } = useDialog()
  if (!editor) {
    return <div className="h-10 border-b border-ui-border-soft bg-ui-fill-subtle/40" />
  }

  const insertLink = async () => {
    const previous = editor.getAttributes('link').href as string | undefined
    const url = await prompt({ title: 'Link', message: 'URL do link', defaultValue: previous ?? 'https://' })
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  const insertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }

  const inTable = editor.isActive('table')

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-ui-border-soft bg-white px-2 py-1">
      <ToolbarBtn
        title="Negrito (Ctrl+B)"
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <b>B</b>
      </ToolbarBtn>
      <ToolbarBtn
        title="Itálico (Ctrl+I)"
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <i>I</i>
      </ToolbarBtn>
      <ToolbarBtn
        title="Riscado"
        active={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <span className="line-through">S</span>
      </ToolbarBtn>
      <ToolbarBtn
        title="Código inline"
        active={editor.isActive('code')}
        onClick={() => editor.chain().focus().toggleCode().run()}
      >
        <span className="font-mono text-xs">{'<>'}</span>
      </ToolbarBtn>

      <ToolbarSep />

      <ToolbarBtn
        title="Título 1"
        active={editor.isActive('heading', { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        <span className="text-xs font-semibold">H1</span>
      </ToolbarBtn>
      <ToolbarBtn
        title="Título 2"
        active={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <span className="text-xs font-semibold">H2</span>
      </ToolbarBtn>
      <ToolbarBtn
        title="Título 3"
        active={editor.isActive('heading', { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <span className="text-xs font-semibold">H3</span>
      </ToolbarBtn>

      <ToolbarSep />

      <ToolbarBtn
        title="Lista"
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        •
      </ToolbarBtn>
      <ToolbarBtn
        title="Lista numerada"
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <span className="text-xs">1.</span>
      </ToolbarBtn>
      <ToolbarBtn
        title="Lista de tarefas"
        active={editor.isActive('taskList')}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
      >
        ☐
      </ToolbarBtn>
      <ToolbarBtn
        title="Citação"
        active={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        ❝
      </ToolbarBtn>
      <ToolbarBtn
        title="Bloco de código"
        active={editor.isActive('codeBlock')}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      >
        <span className="font-mono text-xs">{'{}'}</span>
      </ToolbarBtn>

      <ToolbarSep />

      <ToolbarBtn
        title={editor.isActive('link') ? 'Editar link' : 'Inserir link'}
        active={editor.isActive('link')}
        onClick={insertLink}
      >
        🔗
      </ToolbarBtn>
      <ToolbarBtn title="Inserir tabela" onClick={insertTable} disabled={inTable}>
        ▦
      </ToolbarBtn>

      {inTable ? (
        <>
          <ToolbarSep />
          <ToolbarBtn
            title="Adicionar coluna"
            onClick={() => editor.chain().focus().addColumnAfter().run()}
          >
            <span className="text-xs">+col</span>
          </ToolbarBtn>
          <ToolbarBtn
            title="Adicionar linha"
            onClick={() => editor.chain().focus().addRowAfter().run()}
          >
            <span className="text-xs">+lin</span>
          </ToolbarBtn>
          <ToolbarBtn
            title="Remover coluna"
            onClick={() => editor.chain().focus().deleteColumn().run()}
          >
            <span className="text-xs">−col</span>
          </ToolbarBtn>
          <ToolbarBtn
            title="Remover linha"
            onClick={() => editor.chain().focus().deleteRow().run()}
          >
            <span className="text-xs">−lin</span>
          </ToolbarBtn>
          <ToolbarBtn
            title="Excluir tabela"
            onClick={() => editor.chain().focus().deleteTable().run()}
          >
            🗑
          </ToolbarBtn>
        </>
      ) : null}
    </div>
  )
}
