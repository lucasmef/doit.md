import { Extension, type Editor } from '@tiptap/react'
import type { Node as PMNode } from '@tiptap/pm/model'
import { Plugin } from '@tiptap/pm/state'
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view'
import { createHeadingId, parseHeadingLabel } from '@/lib/note-headings'

function buildCheckbox(view: EditorView, headingPos: number, checked: boolean): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = `doit-heading-checkbox ${checked ? 'is-checked' : ''}`
  button.setAttribute('contenteditable', 'false')
  button.setAttribute('role', 'checkbox')
  button.setAttribute('aria-checked', String(checked))
  button.setAttribute('aria-label', checked ? 'Desmarcar titulo' : 'Marcar titulo como concluido')
  button.title = checked ? 'Desmarcar titulo' : 'Marcar titulo como concluido'
  button.addEventListener('mousedown', (event) => event.preventDefault())
  button.addEventListener('click', (event) => {
    event.preventDefault()
    event.stopPropagation()
    view.dispatch(view.state.tr.insertText(checked ? '[ ]' : '[x]', headingPos + 1, headingPos + 4))
  })
  return button
}

function buildDecorations(doc: PMNode) {
  const decorations: Decoration[] = []
  const occurrences = new Map<string, number>()

  doc.forEach((node, pos) => {
    if (node.type.name !== 'heading') return
    const level = Number(node.attrs['level'] ?? 0)
    if (level < 1 || level > 3) return

    const parsed = parseHeadingLabel(node.textContent)
    if (!parsed.text) return
    const baseId = createHeadingId(parsed.text)
    const occurrence = (occurrences.get(baseId) ?? 0) + 1
    occurrences.set(baseId, occurrence)
    const id = createHeadingId(parsed.text, occurrence)

    const nodeAttrs: Record<string, string> = {
      id,
      'data-outline-id': id,
    }
    if (parsed.checked === true) {
      nodeAttrs['class'] = 'doit-heading-checklist-heading is-checked'
    }

    decorations.push(Decoration.node(pos, pos + node.nodeSize, nodeAttrs))

    if (parsed.checked === null || parsed.markerLength === 0) return
    decorations.push(
      Decoration.inline(pos + 1, pos + 1 + parsed.markerLength, {
        class: 'doit-heading-checkbox-marker',
      }),
      Decoration.widget(pos + 1, (view) => buildCheckbox(view, pos, parsed.checked === true), {
        side: 0,
        ignoreSelection: true,
        key: `doit-heading-checkbox-${pos}-${parsed.checked ? 'checked' : 'open'}`,
      }),
    )
    if (parsed.checked) {
      decorations.push(
        Decoration.inline(pos + 1 + parsed.markerLength, pos + node.nodeSize - 1, {
          class: 'doit-heading-checkbox-label is-checked',
        }),
      )
    }
  })

  return DecorationSet.create(doc, decorations)
}

export const HeadingCheckbox = Extension.create({
  name: 'headingCheckbox',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          decorations(state) {
            return buildDecorations(state.doc)
          },
        },
      }),
    ]
  },
})

function selectedHeading(editor: Editor) {
  const { $from } = editor.state.selection
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth)
    if (node.type.name === 'heading') {
      return { node, contentPos: $from.before(depth) + 1 }
    }
  }
  return null
}

export function hasHeadingCheckbox(editor: Editor) {
  const heading = selectedHeading(editor)
  return heading ? parseHeadingLabel(heading.node.textContent).checked !== null : false
}

export function toggleHeadingCheckbox(editor: Editor) {
  const heading = selectedHeading(editor)
  if (!heading) return false

  const parsed = parseHeadingLabel(heading.node.textContent)
  const transaction = editor.state.tr
  if (parsed.checked === null) {
    transaction.insertText('[ ] ', heading.contentPos)
  } else {
    transaction.delete(heading.contentPos, heading.contentPos + parsed.markerLength)
  }
  editor.view.dispatch(transaction)
  editor.commands.focus()
  return true
}
