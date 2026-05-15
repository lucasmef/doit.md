'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
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
import {
  getHeadingCollapseSummary,
  HeadingCollapse,
  setAllHeadingsCollapsed,
} from './heading-collapse-extension'

type Props = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minHeight?: string
  plain?: boolean
  itemId?: string
  focusAtStart?: boolean
}

type DriveUploadResult = {
  fileId: string
  name: string
  webViewLink: string
}

async function uploadToDrive(itemId: string, file: File): Promise<DriveUploadResult> {
  const form = new FormData()
  form.append('itemId', itemId)
  form.append('file', file)
  const res = await fetch('/api/drive/upload', { method: 'POST', body: form })
  if (res.status === 412) {
    const data = (await res.json().catch(() => ({}))) as { error?: string }
    const reauthErr = new Error(data.error ?? 'Drive reauth required') as Error & {
      needsReauth?: boolean
    }
    reauthErr.needsReauth = true
    throw reauthErr
  }
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(data.error ?? `Upload failed (${res.status})`)
  }
  return (await res.json()) as DriveUploadResult
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Escreva em Markdown...',
  minHeight = 'min-h-[320px]',
  plain = false,
  itemId,
  focusAtStart = false,
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
      HeadingCollapse,
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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingFiles, setUploadingFiles] = useState(0)

  useEffect(() => {
    if (!editor) return
    if (editor.getMarkdown() === value) return
    editor.commands.setContent(value || '', {
      emitUpdate: false,
      contentType: 'markdown',
    })
  }, [editor, value])

  useEffect(() => {
    if (!editor || !focusAtStart) return
    editor.commands.focus('start', { scrollIntoView: true })
    editor.view.dom.closest('[data-note-scroll-container="true"]')?.scrollTo({ top: 0 })
  }, [editor, focusAtStart, itemId])

  const insertDriveLink = useCallback((current: Editor, result: DriveUploadResult) => {
    current
      .chain()
      .focus()
      .insertContent([
        {
          type: 'text',
          text: result.name,
          marks: [{ type: 'link', attrs: { href: result.webViewLink } }],
        },
        { type: 'text', text: ' ' },
      ])
      .run()
  }, [])

  const handleFiles = useCallback(
    async (files: FileList | null | undefined) => {
      if (!editor || !itemId || !files || files.length === 0) return false
      const list = Array.from(files)
      setUploadingFiles((current) => current + list.length)
      try {
        for (const file of list) {
          try {
            const result = await uploadToDrive(itemId, file)
            insertDriveLink(editor, result)
          } catch (err) {
            const e = err as Error & { needsReauth?: boolean }
            if (e.needsReauth) {
              const ok = window.confirm(
                'Conecte sua conta Google com permissao para o Drive para enviar arquivos. Abrir agora?',
              )
              if (ok) window.location.href = '/api/google'
              return true
            }
            window.alert(`Falha ao enviar ${file.name}: ${e.message}`)
          }
        }
      } finally {
        setUploadingFiles((current) => Math.max(0, current - list.length))
      }
      return true
    },
    [editor, itemId, insertDriveLink],
  )

  useEffect(() => {
    if (!editor || !itemId) return
    const dom = editor.view.dom

    const handleFiles = async (files: FileList | null | undefined) => {
      if (!files || files.length === 0) return false
      const list = Array.from(files)
      for (const file of list) {
        try {
          const result = await uploadToDrive(itemId, file)
          insertDriveLink(editor, result)
        } catch (err) {
          const e = err as Error & { needsReauth?: boolean }
          if (e.needsReauth) {
            const ok = window.confirm(
              'Conecte sua conta Google com permissão para o Drive para enviar arquivos. Abrir agora?',
            )
            if (ok) window.location.href = '/api/google'
            return true
          }
          window.alert(`Falha ao enviar ${file.name}: ${e.message}`)
        }
      }
      return true
    }

    const onDrop = (event: DragEvent) => {
      const files = event.dataTransfer?.files
      if (!files || files.length === 0) return
      event.preventDefault()
      event.stopPropagation()
      void handleFiles(files)
    }
    const onPaste = (event: ClipboardEvent) => {
      const files = event.clipboardData?.files
      if (!files || files.length === 0) return
      event.preventDefault()
      event.stopPropagation()
      void handleFiles(files)
    }
    const onDragOver = (event: DragEvent) => {
      if (event.dataTransfer?.types.includes('Files')) {
        event.preventDefault()
      }
    }

    dom.addEventListener('drop', onDrop)
    dom.addEventListener('paste', onPaste)
    dom.addEventListener('dragover', onDragOver)
    return () => {
      dom.removeEventListener('drop', onDrop)
      dom.removeEventListener('paste', onPaste)
      dom.removeEventListener('dragover', onDragOver)
    }
  }, [editor, itemId, insertDriveLink])

  return (
    <div
      className={`${
        plain
          ? 'flex h-full flex-col rounded-lg'
          : 'flex flex-col overflow-hidden rounded-xl border border-ui-border-soft'
      } bg-white transition-colors focus-within:border-brand-300 focus-within:ring-2 focus-within:ring-brand-100`}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => {
          void handleFiles(event.target.files)
          event.target.value = ''
        }}
      />
      <EditorToolbar
        editor={editor}
        canUpload={!!itemId}
        uploadingFiles={uploadingFiles}
        onUploadFiles={() => fileInputRef.current?.click()}
      />
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

function EditorToolbar({
  editor,
  canUpload,
  uploadingFiles,
  onUploadFiles,
}: {
  editor: Editor | null
  canUpload: boolean
  uploadingFiles: number
  onUploadFiles: () => void
}) {
  const { prompt } = useDialog()
  if (!editor) {
    return <div className="h-10 border-b border-ui-border-soft bg-ui-fill-subtle/40" />
  }

  const insertLink = async () => {
    const previous = editor.getAttributes('link').href as string | undefined
    const url = await prompt({
      title: 'Link',
      message: 'URL do link',
      defaultValue: previous ?? 'https://',
    })
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
  const headingSummary = getHeadingCollapseSummary(editor)
  const canToggleHeadings = headingSummary.total > 0
  const shouldCollapseAll = headingSummary.collapsed < headingSummary.total

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

      {(() => {
        const isH1 = editor.isActive('heading', { level: 1 })
        const isH2 = editor.isActive('heading', { level: 2 })
        const isH3 = editor.isActive('heading', { level: 3 })
        const current: 0 | 1 | 2 | 3 = isH1 ? 1 : isH2 ? 2 : isH3 ? 3 : 0
        const next: 1 | 2 | 3 | 0 = current === 0 ? 1 : current === 1 ? 2 : current === 2 ? 3 : 0
        return (
          <ToolbarBtn
            title={`Título${current ? ` ${current}` : ''} · clique para ${next ? `H${next}` : 'parágrafo'}`}
            active={current > 0}
            onClick={() => {
              const chain = editor.chain().focus()
              if (next === 0) chain.setParagraph().run()
              else chain.toggleHeading({ level: next }).run()
            }}
          >
            <span className="text-xs font-semibold">H{current || 1}</span>
          </ToolbarBtn>
        )
      })()}

      <ToolbarSep />

      {(() => {
        const isBullet = editor.isActive('bulletList')
        const isOrdered = editor.isActive('orderedList')
        const current: 0 | 1 | 2 = isBullet ? 1 : isOrdered ? 2 : 0
        const nextLabel = current === 0 ? 'lista' : current === 1 ? 'lista numerada' : 'remover'
        return (
          <ToolbarBtn
            title={`Lista · clique para ${nextLabel}`}
            active={current > 0}
            onClick={() => {
              const chain = editor.chain().focus()
              if (current === 0) chain.toggleBulletList().run()
              else if (current === 1) {
                chain.toggleBulletList().run()
                editor.chain().focus().toggleOrderedList().run()
              } else chain.toggleOrderedList().run()
            }}
          >
            {current === 2 ? <span className="text-xs">1.</span> : '•'}
          </ToolbarBtn>
        )
      })()}
      <ToolbarBtn
        title="Lista de tarefas"
        active={editor.isActive('taskList')}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
      >
        ☐
      </ToolbarBtn>
      <ToolbarBtn
        title={shouldCollapseAll ? 'Recolher todos os topicos' : 'Expandir todos os topicos'}
        disabled={!canToggleHeadings}
        onClick={() => setAllHeadingsCollapsed(editor, shouldCollapseAll)}
      >
        <span className="text-xs">{shouldCollapseAll ? '[-]' : '[+]'}</span>
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
      <ToolbarBtn
        title={
          canUpload
            ? 'Enviar arquivos para a pasta doit.md no Google Drive'
            : 'Salve o item antes de enviar arquivos'
        }
        onClick={onUploadFiles}
        disabled={!canUpload || uploadingFiles > 0}
      >
        <span className="text-xs">{uploadingFiles > 0 ? '...' : '+'}</span>
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
