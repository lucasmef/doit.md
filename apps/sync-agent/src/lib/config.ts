import Conf from 'conf'

type SyncConfig = {
  apiUrl: string
  apiKey: string
  workspacePath: string
  userId: string
}

const store = new Conf<SyncConfig>({ projectName: 'doit-sync' })

export function getConfig(): SyncConfig {
  const apiUrl = store.get('apiUrl')
  const apiKey = store.get('apiKey')
  const workspacePath = store.get('workspacePath')
  const userId = store.get('userId')

  if (!apiUrl || !apiKey || !workspacePath || !userId) {
    throw new Error('Workspace não inicializado. Execute: doit-sync init')
  }

  return { apiUrl, apiKey, workspacePath, userId }
}

export function saveConfig(config: SyncConfig): void {
  store.set('apiUrl', config.apiUrl)
  store.set('apiKey', config.apiKey)
  store.set('workspacePath', config.workspacePath)
  store.set('userId', config.userId)
}

export function isConfigured(): boolean {
  return store.has('apiUrl') && store.has('apiKey')
}
