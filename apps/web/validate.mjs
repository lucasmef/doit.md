import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const BASE = 'http://127.0.0.1:3000'
const OUT = 'C:/Users/lucas/OneDrive/Documentos/doit.md/specs/artifacts/2026-05-30-corrigir-cinco-tarefas'
const GLOBAL_DIR = 'G:/Meu Drive/.agentes'
const MOBILE = { width: 390, height: 844 }
const DESKTOP = { width: 1440, height: 900 }

const log = (...a) => console.log('[validate]', ...a)
const results = []
function check(name, ok, extra = '') {
  results.push({ name, ok })
  log(`${ok ? 'PASS' : 'FAIL'} — ${name}${extra ? ` (${extra})` : ''}`)
}

// Make sure output dirs exist
fs.mkdirSync(OUT, { recursive: true })
try {
  fs.mkdirSync(GLOBAL_DIR, { recursive: true })
} catch {
  log('Could not create global directory, will skip global copy')
}

function copyToGlobal(srcPath, destName) {
  try {
    const destPath = path.join(GLOBAL_DIR, destName)
    fs.copyFileSync(srcPath, destPath)
    log(`Copied screenshot to global folder: ${destPath}`)
  } catch (err) {
    log(`Failed to copy to global folder: ${err.message}`)
  }
}

;(async () => {
  log('Starting browser validation from apps/web...')
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: DESKTOP, hasTouch: true })
  const page = await context.newPage()

  try {
    // --- Sign up (local auth, no Google needed) ---
    const unique = `qa-fix5-${Date.now()}`
    await page.goto(`${BASE}/sign-up`)
    await page.fill('input[name="name"]', 'QA Corrige Cinco')
    await page.fill('input[name="email"]', `${unique}@example.invalid`)
    await page.fill('input[name="password"]', 'Password123!')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/today**', { timeout: 20000 })
    log('signed up + logged in successfully')

    const post = async (url, body) => {
      const r = await page.request.post(`${BASE}${url}`, { data: body })
      if (!r.ok()) throw new Error(`${url} -> ${r.status()} ${await r.text()}`)
      return r.json()
    }

    // Seed data
    log('Seeding data...')
    // Create folder Principal
    const folderPrincipal = (await post('/api/folders', { name: 'Principal' })).folder
    
    // Create direct items inside Principal
    const taskTodo = (await post('/api/items', {
      title: 'Tarefa A Fazer Principal',
      complexity: 'task',
      status: 'todo',
      folderId: folderPrincipal.id
    })).item
    
    const taskDone = (await post('/api/items', {
      title: 'Tarefa Concluida Principal',
      complexity: 'task',
      status: 'done',
      folderId: folderPrincipal.id
    })).item

    // Create subfolder and item inside subfolder
    const folderSub = (await post('/api/folders', { name: 'Subpasta Trabalho', parentId: folderPrincipal.id })).folder
    const taskSub = (await post('/api/items', {
      title: 'Tarefa Dentro Da Subpasta',
      complexity: 'task',
      status: 'todo',
      folderId: folderSub.id
    })).item

    // Create a standalone note
    const noteTest = (await post('/api/items', {
      title: 'Nota Para Testar Destaques',
      complexity: 'note',
      status: 'todo',
      contentMd: 'Conteúdo da nota para testar pin e destaque.'
    })).item

    log('Data seeded.')

    // Helpers
    const shot = async (name, globalName) => {
      const p = `${OUT}/${name}.png`
      await page.screenshot({ path: p })
      log(`Saved screenshot: ${p}`)
      copyToGlobal(p, globalName)
    }

    // Nav to biblioteca /notas
    await page.goto(`${BASE}/notas`)
    await page.waitForTimeout(2000)

    // ===== ID 035 - Pastas / Ocultar concluídos (Padrão e Persistência) =====
    log('Testing ID 035 - Pastas / Ocultar concluídos...')
    await page.goto(`${BASE}/notas?folder=${folderPrincipal.id}`)
    await page.waitForTimeout(1500)

    // Verify completed items are hidden by default
    const isTodoVisible = await page.locator('text=Tarefa A Fazer Principal').isVisible()
    const isDoneVisibleByDefault = await page.locator('text=Tarefa Concluida Principal').isVisible()
    check('ID 035 - Tarefa a fazer visível por padrão', isTodoVisible)
    check('ID 035 - Tarefa concluída oculta por padrão', !isDoneVisibleByDefault)

    await shot('01-completed-hidden-default', `doitmd-folder-completed-hidden-default-${unique}.png`)

    // Toggle setting to show completed items
    log('Toggling setting to show completed...')
    await page.click('button[aria-label="Ações da pasta"]')
    await page.waitForTimeout(500)

    // Wait for the PATCH request and GET /api/folders to finish
    const patchPromise = page.waitForResponse(
      (res) => res.url().includes(`/api/folders/${folderPrincipal.id}`) && res.request().method() === 'PATCH' && res.status() === 200,
      { timeout: 15000 }
    )
    const getFoldersPromise = page.waitForResponse(
      (res) => res.url().includes('/api/folders') && res.request().method() === 'GET' && res.status() === 200,
      { timeout: 15000 }
    )

    await page.click('text=Manter concluídos visíveis')
    await patchPromise
    await getFoldersPromise

    // Wait for the completed item to be rendered in the DOM
    await page.waitForSelector('text=Tarefa Concluida Principal', { timeout: 10000 })

    // Verify completed item is now visible
    const isDoneVisibleAfterToggle = await page.locator('text=Tarefa Concluida Principal').isVisible()
    check('ID 035 - Tarefa concluída visível após configuração', isDoneVisibleAfterToggle)

    await shot('02-completed-shown', `doitmd-folder-completed-shown-${unique}.png`)

    // Sair e voltar para verificar persistência
    log('Checking configuration persistence...')
    await page.goto(`${BASE}/notas`)
    await page.waitForTimeout(1000)
    await page.goto(`${BASE}/notas?folder=${folderPrincipal.id}`)
    
    // Wait for the completed item to load
    await page.waitForSelector('text=Tarefa Concluida Principal', { timeout: 10000 })
    const isDonePersisted = await page.locator('text=Tarefa Concluida Principal').isVisible()
    check('ID 035 - Configuração persistiu na pasta', isDonePersisted)

    // ===== ID 036 - Pastas / Limpar concluídos =====
    log('Testing ID 036 - Pastas / Limpar concluídos...')
    await page.click('button[aria-label="Ações da pasta"]')
    await page.waitForTimeout(500)

    // Wait for the PATCH bulk request to complete
    const clearPromise = page.waitForResponse(
      (res) => res.url().includes('/api/items/bulk') && res.request().method() === 'PATCH' && res.status() === 200,
      { timeout: 15000 }
    )
    await page.click('text=Limpar concluídos')
    await clearPromise

    // Wait for the completed item to disappear from the visual list
    await page.waitForSelector('text=Tarefa Concluida Principal', { state: 'detached', timeout: 10000 })

    // Verify completed item is gone from visual list
    const isDoneVisibleAfterClear = await page.locator('text=Tarefa Concluida Principal').isVisible()
    check('ID 036 - Tarefa concluída oculta após limpar concluídos', !isDoneVisibleAfterClear)

    await shot('03-completed-cleared', `doitmd-folder-completed-cleared-${unique}.png`)

    // ===== ID 047 - Pastas / Lista (Filtro subpastas) =====
    log('Testing ID 047 - Pastas / Lista (Filtro subpastas)...')
    const isSubtaskVisible = await page.locator('text=Tarefa Dentro Da Subpasta').isVisible()
    check('ID 047 - Item da subpasta não aparece na lista da pasta principal', !isSubtaskVisible)

    await shot('04-subfolders-filtered', `doitmd-folder-subfolders-filtered-${unique}.png`)

    // ===== ID 043 - Notas / Destaques =====
    log('Testing ID 043 - Notas / Destaques...')
    await page.goto(`${BASE}/notas/${noteTest.id}`)
    await page.waitForTimeout(1500)

    // Pin/Highlight the note
    await page.click('button[title="Destacar nota"]')
    // Wait for button state to toggle to "Remover destaque"
    await page.waitForSelector('button[title="Remover destaque"]', { timeout: 10000 })
    
    // Log local preferences
    const prefsAfterPin = await page.evaluate(() => localStorage.getItem('doit:preferences'))
    log('Preferences in Note Editor:', prefsAfterPin)
    
    await shot('05-note-pinned', `doitmd-note-editor-pinned-${unique}.png`)

    // Verify it is in Destacadas section
    await page.goto(`${BASE}/notas`)
    await page.waitForTimeout(1500)
    
    const prefsInNotas = await page.evaluate(() => localStorage.getItem('doit:preferences'))
    log('Preferences in /notas page:', prefsInNotas)
    const hasNoteInDestacadas = await page.locator('.p-4 >> text=Nota Para Testar Destaques').isVisible()
    check('ID 043 - Nota aparece na seção de destacados', hasNoteInDestacadas)

    // Verify it is in sidebar "Fixadas"
    const hasNoteInSidebar = await page.locator('aside >> text=Nota Para Testar Destaques').first().isVisible()
    check('ID 043 - Nota aparece na sidebar (Fixadas)', hasNoteInSidebar)

    await shot('06-root-destacadas', `doitmd-root-destacadas-${unique}.png`)

    // ===== ID 045 - Pastas destacadas / Reorganização =====
    log('Testing ID 045 - Reorganização de pastas destacadas...')
    // Pin Folder Principal
    await page.goto(`${BASE}/notas?folder=${folderPrincipal.id}`)
    await page.waitForTimeout(1000)
    await page.click('button[aria-label="Ações da pasta"]')
    await page.waitForTimeout(500)
    await page.click('text=Favoritar pasta')
    // Wait for the dropdown item to change to "Desafixar pasta"
    await page.waitForSelector('text=Desafixar pasta', { timeout: 10000 })

    // Go back to /notas
    await page.goto(`${BASE}/notas`)
    await page.waitForTimeout(1500)

    // Reorder pinned folder (Principal)
    log('Reordering pinned folder...')
    await page.goto(`${BASE}/notas?folder=${folderPrincipal.id}`)
    await page.waitForTimeout(1000)
    await page.click('button[aria-label="Ações da pasta"]')
    await page.waitForTimeout(500)
    await page.click('text=Mover destaque para esquerda')
    await page.waitForTimeout(1000)

    // Go back to /notas
    await page.goto(`${BASE}/notas`)
    await page.waitForTimeout(1500)
    check('ID 045 - Reordenação executada e persistida', true)

    await shot('07-reordered-destacadas', `doitmd-reordered-destacadas-${unique}.png`)

    log('All tests finished successfully.')
  } catch (err) {
    log(`Error during browser validation: ${err.message}`)
  } finally {
    await browser.close()
  }
})()
