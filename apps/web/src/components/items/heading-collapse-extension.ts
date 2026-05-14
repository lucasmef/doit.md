import { Extension } from '@tiptap/react'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view'
import type { Node as PMNode } from '@tiptap/pm/model'
import type { Editor } from '@tiptap/react'

type CollapseState = {
  collapsed: Set<number>
}

type ToggleMeta = {
  toggle?: number
  action?: 'collapseAll' | 'expandAll'
}

const PLUGIN_KEY = new PluginKey<CollapseState>('doitHeadingCollapse')

function getHeadingPositions(doc: PMNode): Set<number> {
  const positions = new Set<number>()
  doc.forEach((node, offset) => {
    if (node.type.name === 'heading') positions.add(offset)
  })
  return positions
}

function makeToggle(view: EditorView, pos: number, collapsed: boolean): HTMLElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = `doit-heading-collapse-toggle ${collapsed ? 'is-collapsed' : ''}`
  button.setAttribute('contenteditable', 'false')
  button.setAttribute('aria-label', collapsed ? 'Expandir topico' : 'Recolher topico')
  button.title = collapsed ? 'Expandir topico' : 'Recolher topico'
  button.textContent = collapsed ? '+' : '-'
  button.addEventListener('mousedown', (event) => event.preventDefault())
  button.addEventListener('click', (event) => {
    event.preventDefault()
    event.stopPropagation()
    view.dispatch(view.state.tr.setMeta(PLUGIN_KEY, { toggle: pos } satisfies ToggleMeta))
  })
  return button
}

function buildDecorations(doc: PMNode, collapsed: Set<number>): DecorationSet {
  const decorations: Decoration[] = []
  const topLevel: Array<{ node: PMNode; pos: number }> = []
  doc.forEach((node, offset) => topLevel.push({ node, pos: offset }))

  for (let index = 0; index < topLevel.length; index += 1) {
    const current = topLevel[index]
    if (!current || current.node.type.name !== 'heading') continue
    const level = Number(current.node.attrs['level'] ?? 1)
    const isCollapsed = collapsed.has(current.pos)
    decorations.push(
      Decoration.widget(current.pos + 1, (view) => makeToggle(view, current.pos, isCollapsed), {
        side: -1,
        ignoreSelection: true,
        key: `doit-heading-collapse-${current.pos}-${isCollapsed ? 'closed' : 'open'}`,
      }),
    )
    if (!isCollapsed) continue

    for (let nextIndex = index + 1; nextIndex < topLevel.length; nextIndex += 1) {
      const next = topLevel[nextIndex]
      if (!next) break
      if (next.node.type.name === 'heading' && Number(next.node.attrs['level'] ?? 1) <= level) {
        break
      }
      decorations.push(
        Decoration.node(next.pos, next.pos + next.node.nodeSize, {
          class: 'doit-heading-collapsed-content',
        }),
      )
    }
  }

  return DecorationSet.create(doc, decorations)
}

export const HeadingCollapse = Extension.create({
  name: 'headingCollapse',
  addProseMirrorPlugins() {
    return [
      new Plugin<CollapseState>({
        key: PLUGIN_KEY,
        state: {
          init: () => ({ collapsed: new Set() }),
          apply(tr, value) {
            const next = new Set<number>()
            value.collapsed.forEach((pos) => {
              const mapped = tr.mapping.map(pos)
              if (mapped >= 0 && mapped <= tr.doc.content.size) next.add(mapped)
            })
            const meta = tr.getMeta(PLUGIN_KEY) as ToggleMeta | undefined
            if (meta?.action === 'expandAll') {
              return { collapsed: new Set() }
            }
            if (meta?.action === 'collapseAll') {
              return { collapsed: getHeadingPositions(tr.doc) }
            }
            if (meta?.toggle !== undefined) {
              if (next.has(meta.toggle)) next.delete(meta.toggle)
              else next.add(meta.toggle)
            }
            return { collapsed: next }
          },
        },
        props: {
          decorations(state) {
            const pluginState = PLUGIN_KEY.getState(state)
            return buildDecorations(state.doc, pluginState?.collapsed ?? new Set())
          },
        },
      }),
    ]
  },
})

export function getHeadingCollapseSummary(editor: Editor): { total: number; collapsed: number } {
  const total = getHeadingPositions(editor.state.doc).size
  const state = PLUGIN_KEY.getState(editor.state)
  return { total, collapsed: state?.collapsed.size ?? 0 }
}

export function setAllHeadingsCollapsed(editor: Editor, collapsed: boolean) {
  editor.view.dispatch(
    editor.state.tr.setMeta(PLUGIN_KEY, {
      action: collapsed ? 'collapseAll' : 'expandAll',
    } satisfies ToggleMeta),
  )
}
