import { createRequire } from 'module'
const require = createRequire('C:/Users/lucas/OneDrive/Documentos/doit.md/apps/web/package.json')
const { chromium } = require('playwright')

const BASE = 'http://127.0.0.1:3000'
const OUT = 'specs/artifacts/2026-05-30-reajustes-ui-030-064'
const MOBILE = { width: 390, height: 844 }
const DESKTOP = { width: 1440, height: 900 }

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

;(async () => {
  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: DESKTOP })
  const page = await context.newPage()
  const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png`, fullPage: false })
  const log = (...a) => console.log(...a)

  try {
    const unique = `qa-reajb-${Date.now()}`
    await page.goto(`${BASE}/sign-up`)
    await page.fill('input[name="name"]', 'QA ReajB')
    await page.fill('input[name="email"]', `${unique}@example.invalid`)
    await page.fill('input[name="password"]', 'Password123!')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/today**', { timeout: 25000 })

    const post = async (url, body) => {
      const r = await page.request.post(`${BASE}${url}`, { data: body })
      if (!r.ok()) throw new Error(`${url} -> ${r.status()} ${await r.text()}`)
      return r.json()
    }
    const tk = todayKey()
    const fr = await post('/api/folders', { name: 'Trabalho' })
    const folderId = fr.folder?.id ?? fr.folder?._id
    await post('/api/items', { title: 'Tarefa aberta de hoje', complexity: 'task', status: 'todo', dueDate: tk, priority: 1, tags: ['foco'] })
    await post('/api/items', { title: 'Tarefa dentro da pasta', complexity: 'task', status: 'todo', folderId })
    log('folderId=', folderId)

    // ---------- ID 062 / 061: editar tarefa -> QuickCapture com checkbox ----------
    await page.goto(`${BASE}/today`)
    await page.waitForTimeout(1500)
    await page.locator('.today-v3-layout .row.task, .today-v3-layout .row.personal').first().dblclick()
    await page.waitForTimeout(1600)
    const dialogVisible = await page.locator('div[role="dialog"]').first().isVisible().catch(() => false)
    const editHeader = await page.getByText('Editar tarefa', { exact: false }).first().isVisible().catch(() => false)
    const checkbox = page.locator('button[aria-label="Concluir tarefa"], button[aria-label="Reabrir tarefa"]').first()
    const checkboxVisible = await checkbox.isVisible().catch(() => false)
    log('EDIT dialog/header/checkbox =', dialogVisible, editHeader, checkboxVisible)
    await shot('05-editar-tarefa-quickcapture')
    if (checkboxVisible) {
      await checkbox.click()
      await page.waitForTimeout(800)
      const concluida = await page.getByText('concluída', { exact: false }).first().isVisible().catch(() => false)
      log('CHECKBOX -> concluída label visivel =', concluida)
      await shot('05b-editar-tarefa-concluida')
    }
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)

    // ---------- ID 059: checkbox da pasta conclui ----------
    await page.goto(`${BASE}/notas?folder=${folderId}`)
    await page.waitForTimeout(1400)
    const rowsBefore = await page.locator('button:has-text("Tarefa dentro da pasta")').count().catch(() => 0)
    await shot('07-pasta-antes')
    // o checkbox é o glyph (primeira célula) dentro da linha da tarefa
    const taskRow = page.locator('button', { hasText: 'Tarefa dentro da pasta' }).first()
    const checkboxCell = taskRow.locator('div[role="button"]').first()
    await checkboxCell.click()
    await page.waitForTimeout(1500)
    const rowsAfter = await page.locator('button:has-text("Tarefa dentro da pasta")').count().catch(() => 0)
    log('FOLDER checkbox: rowsBefore/After =', rowsBefore, rowsAfter, '(esperado 1 -> 0, pasta oculta concluidos)')
    await shot('07b-pasta-depois')

    // ---------- ID 030: modal de evento no MOBILE ----------
    await page.setViewportSize(MOBILE)
    await page.goto(`${BASE}/today`)
    await page.waitForTimeout(1200)
    await page.locator('[title="Novo item"]').first().click()
    await page.waitForTimeout(600)
    await page.locator('[aria-label="Capturar evento"]').first().click()
    await page.waitForTimeout(800)
    const eventDiag = await page.evaluate(() => {
      const dialog = document.querySelector('div[role="dialog"][aria-modal="true"]')
      if (!dialog) return { found: false }
      // card = primeiro filho que não é o overlay aurora (aria-hidden)
      const card = Array.from(dialog.children).find((c) => c.getAttribute('aria-hidden') !== 'true')
      const bg = card ? getComputedStyle(card).backgroundColor : ''
      const aurora = dialog.querySelector('[aria-hidden="true"]')
      const auroraPresent = !!aurora
      return { found: true, cardBg: bg, auroraPresent }
    })
    log('EVENT MODAL (mobile compacto):', JSON.stringify(eventDiag))
    await shot('08-evento-mobile-compacto')

    log('DONE')
  } catch (err) {
    console.log('ERRO:', err.message)
    process.exitCode = 1
  } finally {
    await browser.close()
  }
})()
