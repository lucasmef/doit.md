'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import useSWR from 'swr'
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
  mimeType: string | null
  size: number
  webViewLink: string
}

type DriveAttachment = DriveUploadResult & {
  id?: string
  createdAt?: string
}

type UploadState = {
  id: string
  name: string
  size: number
  mimeType: string
  status: 'uploading' | 'done' | 'error'
  error?: string
  webViewLink?: string
}

const attachmentsFetcher = (url: string) =>
  fetch(url).then(async (res) => {
    if (!res.ok) throw new Error('Falha ao carregar anexos')
    return (await res.json()) as { links: DriveAttachment[] }
  })

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
  const [uploads, setUploads] = useState<UploadState[]>([])
  const { data: attachmentData, mutate: mutateAttachments } = useSWR(
    itemId ? `/api/items/${itemId}/drive-links` : null,
    attachmentsFetcher,
  )
  const uploadingFiles = uploads.filter((upload) => upload.status === 'uploading').length

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

  const handleFiles = useCallback(
    async (files: FileList | null | undefined) => {
      if (!editor || !itemId || !files || files.length === 0) return false
      const list = Array.from(files)
      const queued = list.map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
        name: file.name,
        size: file.size,
        mimeType: file.type || 'application/octet-stream',
        status: 'uploading' as const,
      }))
      setUploads((current) => [...queued, ...current])

      for (let index = 0; index < list.length; index += 1) {
        const file = list[index]
        const upload = queued[index]
        if (!file || !upload) continue
        try {
          const result = await uploadToDrive(itemId, file)
          setUploads((current) =>
            current.map((entry) =>
              entry.id === upload.id
                ? {
                    ...entry,
                    status: 'done',
                    webViewLink: result.webViewLink,
                    mimeType: result.mimeType ?? entry.mimeType,
                    size: result.size,
                  }
                : entry,
            ),
          )
          await mutateAttachments()
        } catch (err) {
          const e = err as Error & { needsReauth?: boolean }
          if (e.needsReauth) {
            const ok = window.confirm(
              'Conecte sua conta Google com permissao para o Drive para enviar arquivos. Abrir agora?',
            )
            if (ok) window.location.href = '/api/google'
            setUploads((current) =>
              current.map((entry) =>
                entry.id === upload.id
                  ? { ...entry, status: 'error', error: 'Reconecte o Google Drive' }
                  : entry,
              ),
            )
            return true
          }
          setUploads((current) =>
            current.map((entry) =>
              entry.id === upload.id ? { ...entry, status: 'error', error: e.message } : entry,
            ),
          )
        }
      }
      return true
    },
    [editor, itemId, mutateAttachments],
  )

  useEffect(() => {
    if (!editor || !itemId) return
    const dom = editor.view.dom
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
  }, [editor, itemId, handleFiles])

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
      <EditorToolbarAccessible
        editor={editor}
        canUpload={!!itemId}
        uploadingFiles={uploadingFiles}
        onUploadFiles={() => fileInputRef.current?.click()}
      />
      <EditorContent editor={editor} className="flex-1 overflow-auto" />
      <AttachmentTray uploads={uploads} attachments={attachmentData?.links ?? []} />
    </div>
  )
}

type ToolbarBtnProps = {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title: string
  className?: string
  children: React.ReactNode
}

function ToolbarBtn({ onClick, active, disabled, title, className = '', children }: ToolbarBtnProps) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`inline-flex h-9 min-w-9 items-center justify-center rounded-md px-2 text-sm transition-colors sm:h-8 sm:min-w-8 ${
        active
          ? 'bg-brand-100 text-brand-700'
          : 'text-ui-text-muted hover:bg-ui-fill-subtle hover:text-ui-text'
      } disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  )
}

function ToolbarGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex shrink-0 items-center gap-0.5 rounded-lg border border-ui-border-soft bg-white p-0.5">
      {children}
    </div>
  )
}

function ToolbarSep() {
  return <span className="mx-0.5 h-5 w-px bg-ui-border-soft" />
}

function formatBytes(size: number) {
  if (!Number.isFinite(size) || size <= 0) return 'Tamanho desconhecido'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = size
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value >= 10 || unit === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unit]}`
}

function fileExtension(name: string, mimeType?: string | null) {
  const ext = name.includes('.') ? name.split('.').pop()?.toUpperCase() : ''
  if (ext) return ext
  if (!mimeType) return 'FILE'
  return mimeType.split('/').pop()?.toUpperCase().slice(0, 8) || 'FILE'
}

function AttachmentIcon({ label }: { label: string }) {
  return (
    <span className="relative inline-flex h-10 w-9 shrink-0 items-center justify-center rounded-md border border-ui-border-soft bg-white text-[9px] font-bold uppercase tracking-wide text-slate-500 shadow-sm">
      <span className="absolute right-0 top-0 h-2 w-2 rounded-bl border-b border-l border-ui-border-soft bg-surface-soft" />
      {label.slice(0, 4)}
    </span>
  )
}

function AttachmentTray({
  uploads,
  attachments,
}: {
  uploads: UploadState[]
  attachments: DriveAttachment[]
}) {
  const visibleUploads = uploads.filter(
    (upload) =>
      upload.status !== 'done' ||
      !attachments.some((attachment) => attachment.webViewLink === upload.webViewLink),
  )
  if (visibleUploads.length === 0 && attachments.length === 0) return null

  return (
    <div className="border-t border-ui-border-soft bg-surface-soft/70 px-3 py-2">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Anexos
        </span>
        {visibleUploads.some((upload) => upload.status === 'uploading') ? (
          <span className="text-[11px] font-medium text-brand-700">Enviando...</span>
        ) : null}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {visibleUploads.map((upload) => (
          <div
            key={upload.id}
            className="flex min-w-[240px] max-w-[320px] items-center gap-2 rounded-lg border border-ui-border-soft bg-white px-2.5 py-2"
          >
            <AttachmentIcon label={fileExtension(upload.name, upload.mimeType)} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-slate-800">{upload.name}</div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                <span>{formatBytes(upload.size)}</span>
                <span aria-hidden="true">|</span>
                <span>{fileExtension(upload.name, upload.mimeType)}</span>
              </div>
              <div
                className={`mt-1 h-1 overflow-hidden rounded-full bg-slate-100 ${
                  upload.status === 'error' ? 'bg-red-100' : ''
                }`}
              >
                <div
                  className={`h-full rounded-full ${
                    upload.status === 'error'
                      ? 'w-full bg-red-400'
                      : upload.status === 'done'
                        ? 'w-full bg-emerald-500'
                        : 'w-2/3 animate-pulse bg-brand-500'
                  }`}
                />
              </div>
              {upload.status === 'error' ? (
                <div className="mt-1 truncate text-[11px] text-red-600">{upload.error}</div>
              ) : null}
            </div>
            {upload.webViewLink ? (
              <a
                href={upload.webViewLink}
                target="_blank"
                rel="noreferrer"
                className="rounded-md px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-surface-selected"
              >
                Abrir
              </a>
            ) : null}
          </div>
        ))}
        {attachments.map((attachment) => (
          <a
            key={attachment.id ?? attachment.fileId}
            href={attachment.webViewLink}
            target="_blank"
            rel="noreferrer"
            className="flex min-w-[240px] max-w-[320px] items-center gap-2 rounded-lg border border-ui-border-soft bg-white px-2.5 py-2 text-left transition-colors hover:border-brand-200 hover:bg-surface-selected"
          >
            <AttachmentIcon label={fileExtension(attachment.name, attachment.mimeType)} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-slate-800">
                {attachment.name}
              </span>
              <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                <span>{formatBytes(attachment.size)}</span>
                <span aria-hidden="true">|</span>
                <span>{fileExtension(attachment.name, attachment.mimeType)}</span>
              </span>
            </span>
            <span className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-brand-700">
              Abrir
            </span>
          </a>
        ))}
      </div>
    </div>
  )
}

function EditorToolbarAccessible({
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
  const [moreOpen, setMoreOpen] = useState(false)
  if (!editor) {
    return <div className="h-[86px] border-b border-ui-border-soft bg-ui-fill-subtle/40" />
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
    <div className="border-b border-ui-border-soft bg-white/95 px-2 py-1.5 shadow-sm backdrop-blur sm:flex sm:flex-wrap sm:items-center sm:gap-1 sm:bg-ui-fill-subtle/60">
      <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none sm:overflow-visible sm:pb-0">
        <ToolbarGroup>
          <ToolbarBtn
            title="Negrito (Ctrl+B)"
            active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <b>B</b>
          </ToolbarBtn>
          <ToolbarBtn
            title="Italico (Ctrl+I)"
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
            title="Codigo inline"
            active={editor.isActive('code')}
            onClick={() => editor.chain().focus().toggleCode().run()}
          >
            <span className="font-mono text-xs">{'<>'}</span>
          </ToolbarBtn>
        </ToolbarGroup>

        <ToolbarGroup>
          {[1, 2, 3].map((level) => (
            <ToolbarBtn
              key={level}
              title={`Titulo H${level}`}
              active={editor.isActive('heading', { level })}
              className="font-semibold"
              onClick={() =>
                editor
                  .chain()
                  .focus()
                  .toggleHeading({ level: level as 1 | 2 | 3 })
                  .run()
              }
            >
              <span className="text-xs">H{level}</span>
            </ToolbarBtn>
          ))}
        </ToolbarGroup>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto scrollbar-none sm:overflow-visible">
        <ToolbarGroup>
          <ToolbarBtn
            title="Lista com marcadores"
            active={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <span className="text-lg leading-none">*</span>
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
            <span className="text-xs">[ ]</span>
          </ToolbarBtn>
          <ToolbarBtn
            title={shouldCollapseAll ? 'Recolher topicos' : 'Expandir topicos'}
            disabled={!canToggleHeadings}
            onClick={() => setAllHeadingsCollapsed(editor, shouldCollapseAll)}
          >
            <span className="text-xs">{shouldCollapseAll ? '[-]' : '[+]'}</span>
          </ToolbarBtn>
        </ToolbarGroup>

        <ToolbarGroup>
          <ToolbarBtn
            title={editor.isActive('link') ? 'Editar link' : 'Inserir link'}
            active={editor.isActive('link')}
            onClick={insertLink}
          >
            <span className="text-xs">link</span>
          </ToolbarBtn>
          <button
            type="button"
            title={
              canUpload
                ? 'Enviar arquivos para a pasta doit.md no Google Drive'
                : 'Salve o item antes de enviar arquivos'
            }
            aria-label={
              canUpload
                ? 'Anexar arquivo no Google Drive'
                : 'Salve o item antes de anexar arquivo'
            }
            onMouseDown={(e) => e.preventDefault()}
            onClick={onUploadFiles}
            disabled={!canUpload || uploadingFiles > 0}
            className="inline-flex h-9 items-center gap-1 rounded-md px-2 text-xs font-semibold text-ui-text-muted transition-colors hover:bg-ui-fill-subtle hover:text-ui-text disabled:cursor-not-allowed disabled:opacity-40 sm:h-8"
          >
            <span className="text-sm leading-none">{uploadingFiles > 0 ? '...' : '+'}</span>
            <span>{uploadingFiles > 0 ? `Enviando ${uploadingFiles}` : 'Anexar'}</span>
          </button>
          <ToolbarBtn
            title={moreOpen ? 'Ocultar mais opcoes' : 'Mostrar mais opcoes'}
            active={moreOpen}
            onClick={() => setMoreOpen((open) => !open)}
            className="min-w-[50px]"
          >
            <span className="text-xs">Mais</span>
          </ToolbarBtn>
        </ToolbarGroup>
      </div>

      {moreOpen || inTable ? (
        <div className="mt-1 flex basis-full items-center gap-1 overflow-x-auto scrollbar-none sm:overflow-visible">
          <ToolbarGroup>
            <ToolbarBtn
              title="Citacao"
              active={editor.isActive('blockquote')}
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
            >
              <span className="text-sm">{'"'}</span>
            </ToolbarBtn>
            <ToolbarBtn
              title="Bloco de codigo"
              active={editor.isActive('codeBlock')}
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            >
              <span className="font-mono text-xs">{'{}'}</span>
            </ToolbarBtn>
            <ToolbarBtn title="Inserir tabela" onClick={insertTable} disabled={inTable}>
              <span className="text-xs">tbl</span>
            </ToolbarBtn>
          </ToolbarGroup>

          {inTable ? (
            <ToolbarGroup>
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
              <span className="text-xs">-col</span>
            </ToolbarBtn>
            <ToolbarBtn
              title="Remover linha"
              onClick={() => editor.chain().focus().deleteRow().run()}
            >
              <span className="text-xs">-lin</span>
            </ToolbarBtn>
            <ToolbarBtn
              title="Excluir tabela"
              onClick={() => editor.chain().focus().deleteTable().run()}
            >
              <span className="text-xs">del</span>
            </ToolbarBtn>
            </ToolbarGroup>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export function EditorToolbar({
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
            {current === 2 ? <span className="text-xs">1.</span> : '*'}
          </ToolbarBtn>
        )
      })()}
      <ToolbarBtn
        title="Lista de tarefas"
        active={editor.isActive('taskList')}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
      >
        [ ]
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
      <button
        type="button"
        title={
          canUpload
            ? 'Enviar arquivos para a pasta doit.md no Google Drive'
            : 'Salve o item antes de enviar arquivos'
        }
        aria-label={
          canUpload
            ? 'Anexar arquivo no Google Drive'
            : 'Salve o item antes de anexar arquivo'
        }
        onMouseDown={(e) => e.preventDefault()}
        onClick={onUploadFiles}
        disabled={!canUpload || uploadingFiles > 0}
        className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-semibold text-ui-text-muted transition-colors hover:bg-ui-fill-subtle hover:text-ui-text disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span className="text-sm leading-none">{uploadingFiles > 0 ? '...' : '+'}</span>
        <span>Anexar</span>
      </button>

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
