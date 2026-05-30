import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const requireFromWeb = createRequire(new URL('../apps/web/package.json', import.meta.url))
const { chromium } = requireFromWeb('playwright')

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3100'
const OUT = 'specs/artifacts/2026-05-30-corrigir-073-074-pastas-data'
const GLOBAL_DIR = 'G:/Meu Drive/.agentes'
const DESKTOP = { width: 1440, height: 900 }
const MOBILE = { width: 390, height: 844 }

const results = []

function log(...args) {
  console.log('[validate-073-074]', ...args)
}

function check(name, ok, extra = '') {
  results.push({ name, ok })
  log(`${ok ? 'PASS' : 'FAIL'} - ${name}${extra ? ` (${extra})` : ''}`)
}

function ensureDirs() {
  fs.mkdirSync(OUT, { recursive: true })
  try {
    fs.mkdirSync(GLOBAL_DIR, { recursive: true })
  } catch (err) {
    log(`Global screenshot folder unavailable: ${err.message}`)
  }
}

function copyToGlobal(src, destName) {
  try {
    fs.copyFileSync(src, path.join(GLOBAL_DIR, destName))
  } catch (err) {
    log(`Global screenshot copy failed: ${err.message}`)
  }
}

async function screenshot(page, name) {
  const file = `${name}.png`
  const dest = path.join(OUT, file)
  await page.screenshot({ path: dest, fullPage: true })
  copyToGlobal(dest, file)
  log(`Saved screenshot: ${dest}`)
}

async function signUp(page) {
  const unique = `qa-073-074-${Date.now()}`
  await page.goto(`${BASE}/sign-up`)
  await page.fill('input[name="name"]', 'QA 073 074')
  await page.fill('input[name="email"]', `${unique}@example.invalid`)
  await page.fill('input[name="password"]', 'Password123!')
  await page.click('button[type="submit"]')
  await page.waitForURL('**/today**', { timeout: 20000 })
  return unique
}

async function post(page, url, body) {
  const res = await page.request.post(`${BASE}${url}`, { data: body })
  if (!res.ok()) throw new Error(`${url} -> ${res.status()} ${await res.text()}`)
  return res.json()
}

async function patch(page, url, body) {
  const res = await page.request.patch(`${BASE}${url}`, { data: body })
  if (!res.ok()) throw new Error(`${url} -> ${res.status()} ${await res.text()}`)
  return res.json()
}

async function get(page, url) {
  const res = await page.request.get(`${BASE}${url}`)
  if (!res.ok()) throw new Error(`${url} -> ${res.status()} ${await res.text()}`)
  return res.json()
}

async function clickFolderTaskCheckbox(page, title) {
  const row = page.locator('button').filter({ hasText: title }).first()
  await row.waitFor({ state: 'visible', timeout: 10000 })
  await row.locator('[role="button"]').first().click()
}

async function validateHideAfterDelay(page, folderId, title, shotPrefix) {
  await page.goto(`${BASE}/notas?folder=${folderId}`)
  await page.waitForLoadState('networkidle')
  await clickFolderTaskCheckbox(page, title)
  await page.waitForTimeout(450)

  const visibleDuringDelay = await page.getByText(title, { exact: true }).isVisible()
  const completedLabel = await page.getByText('Concluido', { exact: false }).isVisible().catch(() => false)
  check(`${shotPrefix} - tarefa permanece visivel durante atraso`, visibleDuringDelay)
  check(`${shotPrefix} - estado concluido aparece durante atraso`, completedLabel || visibleDuringDelay)
  await screenshot(page, `doitmd-pastas-073-074-2026-05-30-${shotPrefix}-temporario`)

  await page.waitForTimeout(1900)
  const hiddenAfterDelay = !(await page.getByText(title, { exact: true }).isVisible().catch(() => false))
  check(`${shotPrefix} - tarefa some depois do atraso`, hiddenAfterDelay)
  await screenshot(page, `doitmd-pastas-073-074-2026-05-30-${shotPrefix}-oculto`)
}

async function validateKeepCompleted(page, folderId, title) {
  await page.goto(`${BASE}/notas?folder=${folderId}`)
  await page.waitForLoadState('networkidle')
  await clickFolderTaskCheckbox(page, title)
  await page.waitForTimeout(2200)

  const stillVisible = await page.getByText(title, { exact: true }).isVisible()
  const completedLabel = await page.getByText('Concluido', { exact: false }).isVisible().catch(() => false)
  check('desktop-keep - tarefa permanece visivel quando pasta mantem concluidos', stillVisible)
  check('desktop-keep - status concluido permanece depois do PATCH', completedLabel || stillVisible)
  await screenshot(page, 'doitmd-pastas-073-074-2026-05-30-04-desktop-keep-visible')
}

async function validateRecurringStillUsesPatch(page, folderId, title) {
  await page.goto(`${BASE}/notas?folder=${folderId}`)
  await page.waitForLoadState('networkidle')
  await clickFolderTaskCheckbox(page, title)
  await page.waitForTimeout(2400)

  const data = await get(page, `/api/items?q=${encodeURIComponent(title)}`)
  const matches = data.items.filter((item) => item.title === title)
  const done = matches.some((item) => item.status === 'done')
  const nextTodo = matches.some((item) => item.status === 'todo' && item.recurrence === 'daily')
  check('ID 073 - recorrencia ainda passa pelo PATCH e preserva concluida', done)
  check('ID 073 - recorrencia ainda cria proxima ocorrencia', nextTodo)
}

async function validateDateShortcut(page, folderId) {
  await page.goto(`${BASE}/notas?folder=${folderId}`)
  await page.waitForLoadState('networkidle')
  await page.keyboard.press('q')
  const titleInput = page.locator('input[placeholder*="amanh"], textarea[placeholder*="amanh"]').first()
  await titleInput.waitFor({ state: 'visible', timeout: 10000 })
  await titleInput.fill('Validar proxima semana')
  await page.waitForTimeout(400)

  const detected = await page.getByText('Detectado:', { exact: false }).isVisible().catch(() => false)
  const bodyText = await page.locator('body').innerText()
  const expectedDateVisible = bodyText.includes('01/06')
  check('ID 074 - quick capture detecta proxima semana', detected)
  check('ID 074 - proxima semana aponta para segunda 2026-06-01', expectedDateVisible)
  await screenshot(page, 'doitmd-data-074-2026-05-30-quickcapture-proxima-semana')
}

ensureDirs()

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: DESKTOP, hasTouch: true })
const page = await context.newPage()

try {
  const unique = await signUp(page)

  const hiddenFolder = (await post(page, '/api/folders', { name: `073 Ocultar ${unique}` })).folder
  const keepFolder = (await post(page, '/api/folders', { name: `073 Manter ${unique}`, hideCompleted: false })).folder
  const mobileFolder = (await post(page, '/api/folders', { name: `073 Mobile ${unique}` })).folder

  await post(page, '/api/items', {
    title: `073 desktop ocultar ${unique}`,
    complexity: 'task',
    status: 'todo',
    folderId: hiddenFolder.id,
  })
  await post(page, '/api/items', {
    title: `073 desktop manter ${unique}`,
    complexity: 'task',
    status: 'todo',
    folderId: keepFolder.id,
  })
  await post(page, '/api/items', {
    title: `073 mobile ocultar ${unique}`,
    complexity: 'task',
    status: 'todo',
    folderId: mobileFolder.id,
  })
  await post(page, '/api/items', {
    title: `073 recorrente ${unique}`,
    complexity: 'task',
    status: 'todo',
    folderId: keepFolder.id,
    dueDate: new Date().toISOString().slice(0, 10),
    recurrence: 'daily',
  })

  await validateHideAfterDelay(page, hiddenFolder.id, `073 desktop ocultar ${unique}`, '01-desktop')
  await validateKeepCompleted(page, keepFolder.id, `073 desktop manter ${unique}`)
  await validateRecurringStillUsesPatch(page, keepFolder.id, `073 recorrente ${unique}`)

  await page.setViewportSize(MOBILE)
  await validateHideAfterDelay(page, mobileFolder.id, `073 mobile ocultar ${unique}`, '05-mobile')

  await page.setViewportSize(DESKTOP)
  await validateDateShortcut(page, hiddenFolder.id)

  await patch(page, `/api/folders/${keepFolder.id}`, { hideCompleted: true })

  const failed = results.filter((r) => !r.ok)
  if (failed.length > 0) {
    throw new Error(`Failed checks: ${failed.map((r) => r.name).join('; ')}`)
  }
} finally {
  await browser.close()
}
