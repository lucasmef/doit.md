import { Extension } from '@tiptap/react'
import { Plugin, PluginKey, NodeSelection } from '@tiptap/pm/state'
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view'
import type { Node as PMNode } from '@tiptap/pm/model'

const PLUGIN_KEY = new PluginKey<DecorationSet>('doitBlockReorder')

type DragState = {
  fromPos: number
  pointerId: number
  startX: number
  startY: number
  activated: boolean
  longPressTimer: ReturnType<typeof setTimeout> | null
}

const TOUCH_LONG_PRESS_MS = 250
const ACTIVATION_THRESHOLD_PX = 5

function findBlockAt(view: EditorView, clientX: number, clientY: number): number | null {
  const coords = view.posAtCoords({ left: clientX, top: clientY })
  if (!coords) return null
  const $pos = view.state.doc.resolve(coords.pos)
  if ($pos.depth === 0) {
    if (coords.pos >= view.state.doc.content.size) {
      const last = view.state.doc.content.size
      const lastChild = view.state.doc.lastChild
      return last - (lastChild?.nodeSize ?? 0)
    }
    return null
  }
  return $pos.before(1)
}

function moveBlock(view: EditorView, fromPos: number, toPos: number, dropBefore: boolean) {
  if (fromPos === toPos) return
  const { state } = view
  const node = state.doc.nodeAt(fromPos)
  if (!node) return
  const fromEnd = fromPos + node.nodeSize

  const targetNode = state.doc.nodeAt(toPos)
  if (!targetNode) return
  const targetEnd = toPos + targetNode.nodeSize

  let insertPos = dropBefore ? toPos : targetEnd

  let tr = state.tr.delete(fromPos, fromEnd)
  if (insertPos > fromPos) insertPos -= node.nodeSize
  tr = tr.insert(insertPos, node)
  view.dispatch(tr.scrollIntoView())
}

function makeHandle(view: EditorView, blockPos: number): HTMLElement {
  const handle = document.createElement('button')
  handle.type = 'button'
  handle.className = 'doit-block-handle'
  handle.setAttribute('contenteditable', 'false')
  handle.setAttribute('aria-label', 'Reordenar bloco (segurar e arrastar)')
  handle.title = 'Segurar e arrastar para reordenar'
  handle.innerHTML =
    '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" focusable="false"><path d="M5 3a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm6 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2ZM5 7a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm6 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2ZM5 11a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm6 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z"/></svg>'

  let dragState: DragState | null = null
  let dropIndicator: HTMLElement | null = null

  const ensureIndicator = () => {
    if (dropIndicator) return dropIndicator
    const el = document.createElement('div')
    el.className = 'doit-block-drop-indicator'
    document.body.appendChild(el)
    dropIndicator = el
    return el
  }
  const removeIndicator = () => {
    if (dropIndicator) {
      dropIndicator.remove()
      dropIndicator = null
    }
  }
  const positionIndicator = (clientY: number, targetPos: number) => {
    const node = view.state.doc.nodeAt(targetPos)
    if (!node) return
    const dom = view.nodeDOM(targetPos)
    if (!(dom instanceof HTMLElement)) return
    const rect = dom.getBoundingClientRect()
    const before = clientY < rect.top + rect.height / 2
    const el = ensureIndicator()
    el.style.top = `${before ? rect.top : rect.bottom}px`
    el.style.left = `${rect.left}px`
    el.style.width = `${rect.width}px`
  }

  const cleanup = () => {
    if (!dragState) return
    if (dragState.longPressTimer) clearTimeout(dragState.longPressTimer)
    document.removeEventListener('pointermove', onPointerMove)
    document.removeEventListener('pointerup', onPointerUp)
    document.removeEventListener('pointercancel', onPointerCancel)
    document.body.classList.remove('doit-block-dragging')
    removeIndicator()
    dragState = null
  }

  const activate = () => {
    if (!dragState || dragState.activated) return
    dragState.activated = true
    document.body.classList.add('doit-block-dragging')
    try {
      handle.setPointerCapture(dragState.pointerId)
    } catch {
      // ignore
    }
  }

  const onPointerMove = (e: PointerEvent) => {
    if (!dragState) return
    const dx = e.clientX - dragState.startX
    const dy = e.clientY - dragState.startY
    if (!dragState.activated) {
      if (Math.hypot(dx, dy) > ACTIVATION_THRESHOLD_PX) {
        if (e.pointerType === 'mouse') {
          if (dragState.longPressTimer) {
            clearTimeout(dragState.longPressTimer)
            dragState.longPressTimer = null
          }
          activate()
        } else {
          // touch movement before long-press = scroll, abort
          cleanup()
        }
      }
      return
    }
    e.preventDefault()
    const targetPos = findBlockAt(view, e.clientX, e.clientY)
    if (targetPos != null) positionIndicator(e.clientY, targetPos)
    else removeIndicator()
  }

  const onPointerUp = (e: PointerEvent) => {
    if (!dragState) return
    if (dragState.activated) {
      const targetPos = findBlockAt(view, e.clientX, e.clientY)
      if (targetPos != null && targetPos !== dragState.fromPos) {
        const dom = view.nodeDOM(targetPos)
        let dropBefore = true
        if (dom instanceof HTMLElement) {
          const rect = dom.getBoundingClientRect()
          dropBefore = e.clientY < rect.top + rect.height / 2
        }
        moveBlock(view, dragState.fromPos, targetPos, dropBefore)
      }
    }
    cleanup()
  }

  const onPointerCancel = () => cleanup()

  handle.addEventListener('pointerdown', (e) => {
    if (e.button !== undefined && e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()

    const node = view.state.doc.nodeAt(blockPos)
    if (node) {
      const tr = view.state.tr.setSelection(NodeSelection.create(view.state.doc, blockPos))
      view.dispatch(tr)
    }

    dragState = {
      fromPos: blockPos,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      activated: false,
      longPressTimer: null,
    }
    if (e.pointerType !== 'mouse') {
      dragState.longPressTimer = setTimeout(() => {
        if (dragState) activate()
      }, TOUCH_LONG_PRESS_MS)
    }
    document.addEventListener('pointermove', onPointerMove, { passive: false })
    document.addEventListener('pointerup', onPointerUp)
    document.addEventListener('pointercancel', onPointerCancel)
  })

  handle.addEventListener('mousedown', (e) => e.preventDefault())

  return handle
}

function buildDecorations(doc: PMNode): DecorationSet {
  const decorations: Decoration[] = []
  doc.forEach((node: PMNode, offset: number) => {
    if (node.type.name === 'horizontalRule') return
    decorations.push(
      Decoration.widget(offset + 1, (view) => makeHandle(view, offset), {
        side: -1,
        ignoreSelection: true,
        key: `doit-handle-${offset}-${node.type.name}`,
      }),
    )
  })
  return DecorationSet.create(doc, decorations)
}

export const BlockReorderHandle = Extension.create({
  name: 'blockReorderHandle',
  addProseMirrorPlugins() {
    return [
      new Plugin<DecorationSet>({
        key: PLUGIN_KEY,
        state: {
          init: (_, state) => buildDecorations(state.doc),
          apply(tr, old) {
            return tr.docChanged ? buildDecorations(tr.doc) : old
          },
        },
        props: {
          decorations(state) {
            return PLUGIN_KEY.getState(state)
          },
        },
      }),
    ]
  },
})
