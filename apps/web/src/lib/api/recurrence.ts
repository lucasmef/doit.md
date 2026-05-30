import { ItemModel } from '@doit/db'
import { newItemId, nextRecurringDate } from '@doit/core'
import type { ItemRecurrence } from '@doit/types'

/**
 * Ao concluir uma tarefa recorrente, cria automaticamente a próxima ocorrência.
 *
 * A ocorrência atual permanece como `done` (histórico preservado) e uma NOVA
 * tarefa `todo` é criada, copiando os metadados relevantes e com a próxima
 * `dueDate` calculada a partir da data original (âncora) via `nextRecurringDate`.
 *
 * Idempotência: só dispara na transição `!done -> done`. Reabrir/reconcluir não
 * gera duplicidade porque `current` já estará `done` na segunda chamada.
 *
 * @param current Documento (lean) ANTES do update — `current.status` é o status anterior.
 * @param nextStatus Status que está sendo aplicado nesta operação.
 * @param userId Dono do item.
 */
export async function spawnNextRecurrenceIfNeeded(
  current: Record<string, unknown>,
  nextStatus: unknown,
  userId: string,
): Promise<void> {
  const recurrence = current['recurrence']

  if (
    nextStatus !== 'done' ||
    current['status'] === 'done' ||
    current['complexity'] === 'note' ||
    typeof recurrence !== 'string' ||
    recurrence === ''
  ) {
    return
  }

  const currentDue = typeof current['dueDate'] === 'string' ? current['dueDate'] : undefined
  const nextDue = nextRecurringDate(currentDue, recurrence as ItemRecurrence)
  const now = new Date().toISOString()

  await ItemModel.create({
    _id: newItemId(),
    userId,
    title: current['title'] ?? '',
    complexity: current['complexity'] ?? 'task',
    status: 'todo',
    tags: Array.isArray(current['tags']) ? current['tags'] : [],
    backlinks: [],
    priority: current['priority'],
    dueDate: nextDue,
    dueTime: current['dueTime'],
    recurrence,
    folderId: current['folderId'],
    areaId: current['areaId'],
    parentId: current['parentId'],
    contentMd: current['contentMd'],
    order: current['order'],
    createdAt: now,
    updatedAt: now,
  })
}
