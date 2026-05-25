import Conf from 'conf'

type SyncConfig = {
  apiUrl: string
  apiKey: string
  workspacePath: string
  userId: string
}

const store = new Conf<Partial<SyncConfig>>({ projectName: 'doit-sync' })

export function getConfig(): SyncConfig {
  const apiUrl = store.get('apiUrl')
  const apiKey = store.get('apiKey')
  const workspacePath = store.get('workspacePath')
  const userId = store.get('userId')

  if (!workspacePath) {
    throw new Error('Workspace não inicializado. Execute: doit-sync init')
  }
  if (!apiUrl || !apiKey || !userId) {
    throw new Error('Não autenticado. Execute: doit-sync login')
  }

  return { apiUrl, apiKey, workspacePath, userId }
}

export function getPartialConfig(): Partial<SyncConfig> {
  return {
    apiUrl: store.get('apiUrl'),
    apiKey: store.get('apiKey'),
    workspacePath: store.get('workspacePath'),
    userId: store.get('userId'),
  }
}

export function saveConfig(config: Partial<SyncConfig>): void {
  for (const [key, value] of Object.entries(config)) {
    if (value !== undefined) store.set(key as keyof SyncConfig, value)
  }
}

export function clearAuth(): void {
  store.delete('apiKey')
  store.delete('userId')
}

export function isLoggedIn(): boolean {
  return !!store.get('apiKey') && !!store.get('userId')
}

export function isInitialized(): boolean {
  return !!store.get('workspacePath')
}
