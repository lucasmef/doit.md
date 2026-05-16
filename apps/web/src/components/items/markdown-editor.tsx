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

function IconUploadButton({
  canUpload,
  uploadingFiles,
  onUploadFiles,
  className = '',
}: {
  canUpload: boolean
  uploadingFiles: number
  onUploadFiles: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      title={
        canUpload
          ? 'Enviar arquivos para a pasta doit.md no Google Drive'
          : 'Salve o item antes de enviar arquivos'
      }
      aria-label={
        canUpload ? 'Anexar arquivo no Google Drive' : 'Salve o item antes de anexar arquivo'
      }
      onMouseDown={(e) => e.preventDefault()}
      onClick={onUploadFiles}
      disabled={!canUpload || uploadingFiles > 0}
      className={`relative inline-flex h-9 min-w-9 items-center justify-center rounded-md px-2 text-ui-text-muted transition-colors hover:bg-ui-fill-subtle hover:text-ui-text disabled:cursor-not-allowed disabled:opacity-40 sm:h-8 sm:min-w-8 ${className}`}
    >
      <EditorIcon name="paperclip" />
      {uploadingFiles > 0 ? (
        <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold leading-none text-white">
          {uploadingFiles}
        </span>
      ) : null}
    </button>
  )
}

function MobileToolbarBtn({
  onClick,
  active,
  disabled,
  title,
  children,
}: ToolbarBtnProps) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`flex h-9 min-w-0 items-center justify-center rounded-md text-sm transition-colors ${
        active
          ? 'bg-brand-100 text-brand-700'
          : 'text-ui-text-muted hover:bg-ui-fill-subtle hover:text-ui-text'
      } disabled:cursor-not-allowed disabled:opacity-40`}
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

type EditorIconName =
  | 'bold'
  | 'italic'
  | 'strike'
  | 'code'
  | 'bulletList'
  | 'orderedList'
  | 'taskList'
  | 'collapse'
  | 'expand'
  | 'link'
  | 'paperclip'
  | 'quote'
  | 'codeBlock'
  | 'table'
  | 'columnAdd'
  | 'rowAdd'
  | 'columnRemove'
  | 'rowRemove'
  | 'trash'

function EditorIcon({ name }: { name: EditorIconName }) {
  const common = {
    className: 'h-4 w-4',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }

  if (name === 'bold') {
    return (
      <svg {...common}>
        <path d="M7 5h6a3.5 3.5 0 0 1 0 7H7z" />
        <path d="M7 12h7a3.5 3.5 0 0 1 0 7H7z" />
        <path d="M7 5v14" />
      </svg>
    )
  }
  if (name === 'italic') {
    return (
      <svg {...common}>
        <path d="M10 5h8" />
        <path d="M6 19h8" />
        <path d="M14 5 10 19" />
      </svg>
    )
  }
  if (name === 'strike') {
    return (
      <svg {...common}>
        <path d="M6 12h12" />
        <path d="M16 7.5A4.5 4.5 0 0 0 12.5 6H11a3 3 0 0 0-2.6 4.5" />
        <path d="M8 16.5A5 5 0 0 0 11.5 18H13a3 3 0 0 0 2.7-4.3" />
      </svg>
    )
  }
  if (name === 'code') {
    return (
      <svg {...common}>
        <path d="m10 8-4 4 4 4" />
        <path d="m14 8 4 4-4 4" />
      </svg>
    )
  }
  if (name === 'bulletList') {
    return (
      <svg {...common}>
        <path d="M9 7h10" />
        <path d="M9 12h10" />
        <path d="M9 17h10" />
        <path d="M5 7h.01" />
        <path d="M5 12h.01" />
        <path d="M5 17h.01" />
      </svg>
    )
  }
  if (name === 'orderedList') {
    return (
      <svg {...common}>
        <path d="M10 7h9" />
        <path d="M10 12h9" />
        <path d="M10 17h9" />
        <path d="M4 6h1v3" />
        <path d="M4 17h2" />
        <path d="M4 15.5A1.5 1.5 0 0 1 5.5 14h.2a1.3 1.3 0 0 1 .8 2.3L4 19" />
      </svg>
    )
  }
  if (name === 'taskList') {
    return (
      <svg {...common}>
        <path d="M9 7h10" />
        <path d="M9 17h10" />
        <path d="m4 7 1 1 2-3" />
        <rect x="4" y="14" width="3" height="3" rx=".5" />
      </svg>
    )
  }
  if (name === 'collapse' || name === 'expand') {
    return (
      <svg {...common}>
        <path d={name === 'collapse' ? 'm8 10 4 4 4-4' : 'm8 14 4-4 4 4'} />
        <path d="M5 5h14" />
        <path d="M5 19h14" />
      </svg>
    )
  }
  if (name === 'link') {
    return (
      <svg {...common}>
        <path d="M10 13a5 5 0 0 0 7.1 0l1.4-1.4a5 5 0 0 0-7.1-7.1L10.5 5.4" />
        <path d="M14 11a5 5 0 0 0-7.1 0l-1.4 1.4a5 5 0 0 0 7.1 7.1l.9-.9" />
      </svg>
    )
  }
  if (name === 'paperclip') {
    return (
      <svg {...common}>
        <path d="m21 11.5-8.8 8.8a5.5 5.5 0 0 1-7.8-7.8l9.2-9.2a3.7 3.7 0 0 1 5.2 5.2l-9.1 9.1a1.9 1.9 0 0 1-2.7-2.7l8.5-8.5" />
      </svg>
    )
  }
  if (name === 'quote') {
    return (
      <svg {...common}>
        <path d="M8 11H5.5A3.5 3.5 0 0 1 9 7.5V16H5v-5" />
        <path d="M18 11h-2.5A3.5 3.5 0 0 1 19 7.5V16h-4v-5" />
      </svg>
    )
  }
  if (name === 'codeBlock') {
    return (
      <svg {...common}>
        <rect x="4" y="5" width="16" height="14" rx="2" />
        <path d="m10 10-2 2 2 2" />
        <path d="m14 10 2 2-2 2" />
      </svg>
    )
  }
  if (name === 'table') {
    return (
      <svg {...common}>
        <rect x="4" y="5" width="16" height="14" rx="2" />
        <path d="M4 10h16" />
        <path d="M9 5v14" />
        <path d="M15 5v14" />
      </svg>
    )
  }
  if (name === 'columnAdd' || name === 'columnRemove') {
    return (
      <svg {...common}>
        <rect x="4" y="5" width="12" height="14" rx="2" />
        <path d="M10 5v14" />
        {name === 'columnAdd' ? <path d="M19 8v6" /> : null}
        <path d="M16 11h6" />
      </svg>
    )
  }
  if (name === 'rowAdd' || name === 'rowRemove') {
    return (
      <svg {...common}>
        <rect x="4" y="5" width="16" height="12" rx="2" />
        <path d="M4 11h16" />
        <path d="M9 20h6" />
        {name === 'rowAdd' ? <path d="M12 17v6" /> : null}
      </svg>
    )
  }
  return (
    <svg {...common}>
      <path d="M6 7h12" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 7V5h6v2" />
      <path d="m8 7 1 12h6l1-12" />
    </svg>
  )
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
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false)
  if (!editor) {
    return <div className="h-[48px] border-b border-ui-border-soft bg-ui-fill-subtle/40" />
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

  const advancedTools = (
    <>
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

      <ToolbarGroup>
        <ToolbarBtn
          title="Riscado"
          active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <EditorIcon name="strike" />
        </ToolbarBtn>
        <ToolbarBtn
          title="Codigo inline"
          active={editor.isActive('code')}
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          <EditorIcon name="code" />
        </ToolbarBtn>
        <ToolbarBtn
          title="Lista numerada"
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <EditorIcon name="orderedList" />
        </ToolbarBtn>
        <ToolbarBtn
          title={shouldCollapseAll ? 'Recolher topicos' : 'Expandir topicos'}
          disabled={!canToggleHeadings}
          onClick={() => setAllHeadingsCollapsed(editor, shouldCollapseAll)}
        >
          <EditorIcon name={shouldCollapseAll ? 'collapse' : 'expand'} />
        </ToolbarBtn>
      </ToolbarGroup>

      <ToolbarGroup>
        <ToolbarBtn
          title="Citacao"
          active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <EditorIcon name="quote" />
        </ToolbarBtn>
        <ToolbarBtn
          title="Bloco de codigo"
          active={editor.isActive('codeBlock')}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          <EditorIcon name="codeBlock" />
        </ToolbarBtn>
        <ToolbarBtn title="Inserir tabela" onClick={insertTable} disabled={inTable}>
          <EditorIcon name="table" />
        </ToolbarBtn>
      </ToolbarGroup>
    </>
  )

  const tableTools = inTable ? (
    <ToolbarGroup>
      <ToolbarBtn
        title="Adicionar coluna"
        onClick={() => editor.chain().focus().addColumnAfter().run()}
      >
        <EditorIcon name="columnAdd" />
      </ToolbarBtn>
      <ToolbarBtn title="Adicionar linha" onClick={() => editor.chain().focus().addRowAfter().run()}>
        <EditorIcon name="rowAdd" />
      </ToolbarBtn>
      <ToolbarBtn title="Remover coluna" onClick={() => editor.chain().focus().deleteColumn().run()}>
        <EditorIcon name="columnRemove" />
      </ToolbarBtn>
      <ToolbarBtn title="Remover linha" onClick={() => editor.chain().focus().deleteRow().run()}>
        <EditorIcon name="rowRemove" />
      </ToolbarBtn>
      <ToolbarBtn title="Excluir tabela" onClick={() => editor.chain().focus().deleteTable().run()}>
        <EditorIcon name="trash" />
      </ToolbarBtn>
    </ToolbarGroup>
  ) : null

  return (
    <div className="border-b border-ui-border-soft bg-white/95 px-2 py-1.5 shadow-sm backdrop-blur sm:bg-ui-fill-subtle/60">
      <div className="hidden min-w-0 flex-1 flex-wrap items-center gap-1 sm:flex">
        <ToolbarGroup>
          <ToolbarBtn
            title="Negrito (Ctrl+B)"
            active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <EditorIcon name="bold" />
          </ToolbarBtn>
          <ToolbarBtn
            title="Italico (Ctrl+I)"
            active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <EditorIcon name="italic" />
          </ToolbarBtn>
          <ToolbarBtn
            title="Riscado"
            active={editor.isActive('strike')}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            <EditorIcon name="strike" />
          </ToolbarBtn>
          <ToolbarBtn
            title="Codigo inline"
            active={editor.isActive('code')}
            onClick={() => editor.chain().focus().toggleCode().run()}
          >
            <EditorIcon name="code" />
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

        <ToolbarGroup>
          <ToolbarBtn
            title="Lista com marcadores"
            active={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <EditorIcon name="bulletList" />
          </ToolbarBtn>
          <ToolbarBtn
            title="Lista numerada"
            active={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <EditorIcon name="orderedList" />
          </ToolbarBtn>
          <ToolbarBtn
            title="Lista de tarefas"
            active={editor.isActive('taskList')}
            onClick={() => editor.chain().focus().toggleTaskList().run()}
          >
            <EditorIcon name="taskList" />
          </ToolbarBtn>
          <ToolbarBtn
            title={shouldCollapseAll ? 'Recolher topicos' : 'Expandir topicos'}
            disabled={!canToggleHeadings}
            onClick={() => setAllHeadingsCollapsed(editor, shouldCollapseAll)}
          >
            <EditorIcon name={shouldCollapseAll ? 'collapse' : 'expand'} />
          </ToolbarBtn>
        </ToolbarGroup>

        <ToolbarGroup>
          <ToolbarBtn
            title="Citacao"
            active={editor.isActive('blockquote')}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            <EditorIcon name="quote" />
          </ToolbarBtn>
          <ToolbarBtn
            title="Bloco de codigo"
            active={editor.isActive('codeBlock')}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          >
            <EditorIcon name="codeBlock" />
          </ToolbarBtn>
        </ToolbarGroup>

        <ToolbarGroup>
          <ToolbarBtn
            title={editor.isActive('link') ? 'Editar link' : 'Inserir link'}
            active={editor.isActive('link')}
            onClick={insertLink}
          >
            <EditorIcon name="link" />
          </ToolbarBtn>
          <ToolbarBtn title="Inserir tabela" onClick={insertTable} disabled={inTable}>
            <EditorIcon name="table" />
          </ToolbarBtn>
          <IconUploadButton
            canUpload={canUpload}
            uploadingFiles={uploadingFiles}
            onUploadFiles={onUploadFiles}
          />
        </ToolbarGroup>

        {tableTools}
      </div>

      <div className="grid w-full grid-cols-7 gap-1 sm:hidden">
        <MobileToolbarBtn
            title="Negrito (Ctrl+B)"
            active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <EditorIcon name="bold" />
        </MobileToolbarBtn>
        <MobileToolbarBtn
            title="Italico (Ctrl+I)"
            active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <EditorIcon name="italic" />
        </MobileToolbarBtn>
        <MobileToolbarBtn
            title="Lista com marcadores"
            active={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <EditorIcon name="bulletList" />
        </MobileToolbarBtn>
        <MobileToolbarBtn
            title="Lista de tarefas"
            active={editor.isActive('taskList')}
            onClick={() => editor.chain().focus().toggleTaskList().run()}
          >
            <EditorIcon name="taskList" />
        </MobileToolbarBtn>
        <MobileToolbarBtn
            title={editor.isActive('link') ? 'Editar link' : 'Inserir link'}
            active={editor.isActive('link')}
            onClick={insertLink}
          >
            <EditorIcon name="link" />
        </MobileToolbarBtn>
        <IconUploadButton
          canUpload={canUpload}
          uploadingFiles={uploadingFiles}
          onUploadFiles={onUploadFiles}
          className="!h-9 !min-w-0 !px-0"
        />
        <MobileToolbarBtn
            title={mobileSheetOpen ? 'Fechar ferramentas' : 'Mais ferramentas'}
            active={mobileSheetOpen}
            onClick={() => setMobileSheetOpen((open) => !open)}
          >
            <span className="text-lg leading-none">+</span>
        </MobileToolbarBtn>
      </div>

      {mobileSheetOpen ? (
        <div className="mt-2 rounded-xl border border-ui-border-soft bg-white p-2 shadow-cool-sm sm:hidden">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wide text-navy-300">
              Ferramentas
            </span>
            <button
              type="button"
              onClick={() => setMobileSheetOpen(false)}
              className="rounded-md px-2 py-1 text-[12px] font-semibold text-navy-400 hover:bg-surface-soft hover:text-navy-700"
            >
              Fechar
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {advancedTools}
            {tableTools}
          </div>
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
