import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const requireFromWeb = createRequire(new URL('../apps/web/package.json', import.meta.url))
const { chromium } = requireFromWeb('playwright')

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3200'
const OUT = 'specs/artifacts/2026-05-31-validar-030-081'
const DESKTOP = { width: 1440, height: 900 }
fs.mkdirSync(OUT, { recursive: true })

const results = []
function record(id, status, evidence = '') { results.push({ id, status, evidence }); console.log(`[RT] ${id}: ${status} — ${evidence}`) }
async function shot(page, name) { try { await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false }) } catch {} }

async function signUp(page) {
  const unique = `qa-rt-${Date.now()}`
  await page.goto(`${BASE}/sign-up`)
  await page.fill('input[name="name"]', 'QA RT')
  await page.fill('input[name="email"]', `${unique}@example.invalid`)
  await page.fill('input[name="password"]', 'Password123!')
  await page.click('button[type="submit"]')
  await page.waitForURL('**/today**', { timeout: 30000 })
  return unique
}
async function post(page, url, body) {
  const r = await page.request.post(`${BASE}${url}`, { data: body })
  if (!r.ok()) throw new Error(`${url} -> ${r.status()} ${await r.text()}`)
  return r.json()
}
// busca todos os botões da página por texto (o ItemContextMenu não usa role=menu)
async function buttonsText(page) {
  return page.evaluate(() => Array.from(document.querySelectorAll('button')).map((b) => (b.textContent || '').trim()).filter(Boolean))
}
const has = (arr, re) => arr.some((t) => re.test(t))

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: DESKTOP, hasTouch: true })
const page = await context.newPage()

try {
  const unique = await signUp(page)
  const tk = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` })()
  const folderA = (await post(page, '/api/folders', { name: `RT Pasta ${unique}` })).folder
  await post(page, '/api/items', { title: 'RT tarefa hoje', complexity: 'task', status: 'todo', dueDate: tk, priority: 1 })
  const datedTitle = `RT datada ${unique}`
  await post(page, '/api/items', { title: datedTitle, complexity: 'task', status: 'todo', folderId: folderA.id, dueDate: '2026-06-08' })
  const noteTitle = `RT nota ${unique}`
  await post(page, '/api/items', { title: noteTitle, complexity: 'note', status: 'todo', folderId: folderA.id, contentMd: 'corpo' })

  // ===== 061 / 062 : via painel de detalhes -> botão "Editar" =====
  try {
    await page.goto(`${BASE}/today`)
    await page.waitForTimeout(1800)
    await page.locator('.today-v3-layout .row.task, .today-v3-layout .row.personal').first().click()
    await page.waitForTimeout(700)
    // botão "✎ Editar" no painel
    const editBtn = page.locator('.today-v3-layout .detail button', { hasText: 'Editar' }).first()
    let opened = false
    if (await editBtn.isVisible().catch(() => false)) { await editBtn.click(); opened = true }
    else {
      // fallback: duplo clique
      await page.locator('.today-v3-layout .row.task, .today-v3-layout .row.personal').first().dblclick()
      opened = true
    }
    await page.waitForTimeout(1500)
    const editHeader = await page.getByText('Editar tarefa', { exact: false }).first().isVisible().catch(() => false)
    const checkbox = page.locator('button[aria-label="Concluir tarefa"], button[aria-label="Reabrir tarefa"]').first()
    const checkboxVisible = await checkbox.isVisible().catch(() => false)
    const oldOverlay = await page.locator('.item-detail-overlay').first().isVisible().catch(() => false)
    await shot(page, 'ID062-editar-tarefa-modal-desktop')
    record('062', editHeader && !oldOverlay ? 'OK' : 'Não OK', `header "Editar tarefa"=${editHeader} (via painel Editar=${opened})`)
    let toggled = false
    if (checkboxVisible) {
      await checkbox.click(); await page.waitForTimeout(700)
      toggled = await page.getByText('concluída', { exact: false }).first().isVisible().catch(() => false)
      await shot(page, 'ID061-editar-tarefa-concluida-desktop')
    }
    record('061', checkboxVisible ? (toggled ? 'OK' : 'Parcial') : 'Não OK', `checkbox concluir visível=${checkboxVisible}, alterna=${toggled}`)
    await page.keyboard.press('Escape').catch(() => {})
  } catch (e) { record('061', 'Não testado', e.message); record('062', 'Não testado', e.message) }

  // ===== 070 : kebab "Ações da pasta" -> "Mover pasta" =====
  try {
    await page.goto(`${BASE}/notas?folder=${folderA.id}`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(600)
    await page.getByLabel('Ações da pasta').click()
    await page.waitForTimeout(500)
    const btns = await buttonsText(page)
    const move = has(btns, /Mover pasta/i)
    await shot(page, 'ID070-mover-pasta-kebab-desktop')
    let destinos = false
    if (move) {
      await page.evaluate(() => { const b = Array.from(document.querySelectorAll('button')).find((x) => /Mover pasta/i.test(x.textContent || '')); b?.click() })
      await page.waitForTimeout(500)
      const after = await buttonsText(page)
      destinos = has(after, /Raiz|sem pasta-m/i)
      await shot(page, 'ID070-mover-pasta-destinos-desktop')
    }
    record('070', move ? (destinos ? 'OK' : 'Parcial') : 'Não OK', `kebab "Mover pasta"=${move}, lista de destino=${destinos}`)
    await page.keyboard.press('Escape').catch(() => {})
  } catch (e) { record('070', 'Não testado', e.message) }

  // ===== 071 : right-click item datado -> "Remover data" =====
  try {
    await page.goto(`${BASE}/notas?folder=${folderA.id}`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(600)
    const row = page.getByText(datedTitle, { exact: false }).first()
    await row.waitFor({ state: 'visible', timeout: 15000 })
    const b = await row.boundingBox()
    await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2, { button: 'right' })
    await page.waitForTimeout(600)
    const btns = await buttonsText(page)
    const removeDate = has(btns, /Remover data/i)
    await shot(page, 'ID071-remover-data-menu-desktop')
    record('071', removeDate ? 'OK' : 'Não OK', `ação "Remover data"=${removeDate}`)
    await page.keyboard.press('Escape').catch(() => {})
  } catch (e) { record('071', 'Não testado', e.message) }

  // ===== 043 : right-click nota -> "Destacar" -> área Destacadas =====
  try {
    await page.goto(`${BASE}/notas?folder=${folderA.id}`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(600)
    const row = page.getByText(noteTitle, { exact: false }).first()
    await row.waitFor({ state: 'visible', timeout: 15000 })
    const b = await row.boundingBox()
    await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2, { button: 'right' })
    await page.waitForTimeout(600)
    const btns = await buttonsText(page)
    const destacar = has(btns, /Destacar/i)
    await shot(page, 'ID043-destacar-menu-desktop')
    let pinnedShown = false
    if (destacar) {
      await page.evaluate(() => { const x = Array.from(document.querySelectorAll('button')).find((y) => /^Destacar/i.test((y.textContent || '').trim())); x?.click() })
      await page.waitForTimeout(900)
      // reabre o menu de contexto: agora deve mostrar "Remover destaque"
      const b2 = await page.getByText(noteTitle, { exact: false }).first().boundingBox()
      await page.mouse.click(b2.x + b2.width / 2, b2.y + b2.height / 2, { button: 'right' })
      await page.waitForTimeout(500)
      const btns2 = await buttonsText(page)
      pinnedShown = has(btns2, /Remover destaque/i)
      await shot(page, 'ID043-destacada-confirma-desktop')
      await page.keyboard.press('Escape').catch(() => {})
    }
    record('043', destacar ? (pinnedShown ? 'OK' : 'Parcial') : 'Não OK', `menu "Destacar"=${destacar}, vira "Remover destaque" após clicar=${pinnedShown}`)
  } catch (e) { record('043', 'Não testado', e.message) }

} catch (e) {
  console.log('[RT] FATAL', e.message)
} finally {
  await browser.close()
}

console.log('\n==== RETEST RESUMO ====')
for (const r of results) console.log(`ID ${r.id}: ${r.status} | ${r.evidence}`)
fs.writeFileSync(path.join(OUT, 'resultados-retest.json'), JSON.stringify(results, null, 2))
