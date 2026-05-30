'use client'

import { useRef } from 'react'

type Point = { clientX: number; clientY: number }

type Options = {
  onLongPress: (point: Point) => void
  delay?: number
  moveTolerance?: number
}

/**
 * Toque longo (mobile) e clique-direito (desktop) para abrir o menu de contexto/ações.
 *
 * - Dispara após `delay` ms mantendo o dedo parado (cancela se mover > `moveTolerance`px → não conflita com scroll).
 * - Ignora ponteiro do tipo mouse no toque longo (mouse usa onContextMenu).
 * - `consumeClick()` deve ser chamado no onClick do elemento para suprimir o clique-fantasma pós-long-press.
 */
export function useLongPress({ onLongPress, delay = 450, moveTolerance = 10 }: Options) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const triggered = useRef(false)
  const start = useRef<{ x: number; y: number } | null>(null)

  function clear() {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
    start.current = null
  }

  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType === 'mouse') return
    triggered.current = false
    clear()
    const x = e.clientX
    const y = e.clientY
    start.current = { x, y }
    timer.current = setTimeout(() => {
      triggered.current = true
      window.getSelection()?.removeAllRanges()
      onLongPress({ clientX: x, clientY: y })
    }, delay)
  }

  function onPointerMove(e: React.PointerEvent) {
    const s = start.current
    if (!s) return
    if (Math.hypot(e.clientX - s.x, e.clientY - s.y) > moveTolerance) clear()
  }

  function onContextMenu(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    onLongPress({ clientX: e.clientX, clientY: e.clientY })
  }

  function consumeClick(): boolean {
    if (triggered.current) {
      triggered.current = false
      return true
    }
    return false
  }

  return {
    longPressProps: {
      'data-long-press-target': 'true',
      onPointerDown,
      onPointerMove,
      onPointerUp: clear,
      onPointerCancel: clear,
      onContextMenu,
    },
    consumeClick,
  }
}
