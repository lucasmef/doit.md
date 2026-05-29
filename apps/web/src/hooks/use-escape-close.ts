'use client'

import { useEffect, useRef } from 'react'

// Pilha global de modais abertos. O topo da pilha é o modal "ativo" que deve fechar com Esc.
// Um único listener em fase de captura no document garante que o Esc funcione mesmo quando o
// foco não está dentro do modal (causa-raiz do ID 010) e fecha apenas o modal mais recente.
const stack: Array<() => void> = []
let listening = false

function handleKeyDown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  const top = stack[stack.length - 1]
  if (!top) return
  // Há um modal aberto: ele tem prioridade sobre quaisquer outros atalhos de Escape.
  event.preventDefault()
  event.stopPropagation()
  top()
}

/**
 * Fecha o modal com Esc independentemente de onde está o foco.
 * Mantém uma pilha: apenas o último modal registrado responde ao Esc.
 *
 * @param active quando true, o modal está aberto e participa da pilha
 * @param onClose chamada para fechar o modal
 */
export function useEscapeClose(active: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!active) return
    const entry = () => onCloseRef.current()
    stack.push(entry)
    if (!listening) {
      document.addEventListener('keydown', handleKeyDown, true)
      listening = true
    }
    return () => {
      const idx = stack.lastIndexOf(entry)
      if (idx !== -1) stack.splice(idx, 1)
      if (stack.length === 0 && listening) {
        document.removeEventListener('keydown', handleKeyDown, true)
        listening = false
      }
    }
  }, [active])
}
