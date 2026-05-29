import { chromium } from 'playwright'

const BASE = 'http://127.0.0.1:3000'
const OUT = process.env.OUT_DIR || 'specs/artifacts/2026-05-29-apply-new-today-layout'
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

  try {
    const unique = `qa-today-${Date.now()}`
    await page.goto(`${BASE}/sign-up`)
    await page.fill('input[name="name"]', 'QA Today')
    await page.fill('input[name="email"]', `${unique}@example.invalid`)
    await page.fill('input[name="password"]', 'Password123!')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/today**', { timeout: 20000 })
    console.log('signed up')

    const post = async (url, body) => {
      const r = await page.request.post(`${BASE}${url}`, { data: body })
      if (!r.ok()) throw new Error(`${url} -> ${r.status()} ${await r.text()}`)
      return r.json()
    }

    const tk = todayKey()
    // tarefas/notas de hoje com horário + prioridades variadas (testa ordenação + barra de prioridade)
    await post('/api/items', { title: 'Reunião de produto', complexity: 'task', status: 'todo', dueDate: tk, dueTime: '14:30', priority: 1, tags: ['trabalho'] })
    await post('/api/items', { title: 'Almoço com cliente', complexity: 'task', status: 'todo', dueDate: tk, dueTime: '12:00', priority: 2, tags: [] })
    await post('/api/items', { title: 'Conferir vendas do mês', complexity: 'task', status: 'todo', dueDate: tk, priority: 1, tags: ['financeiro'] })
    await post('/api/items', { title: 'Acompanhar devoluções', complexity: 'task', status: 'todo', dueDate: tk, priority: 2, tags: ['loja'] })
    await post('/api/items', { title: 'Orçamentos', complexity: 'task', status: 'todo', dueDate: tk, priority: 3, tags: ['comercial'] })
    await post('/api/items', { title: 'Mandar boleto novo', complexity: 'task', status: 'todo', dueDate: tk, tags: ['financeiro'] })
    await post('/api/items', { title: 'Ler artigo de engenharia de software', complexity: 'note', status: 'todo', dueDate: tk, tags: [] })
    console.log('seeded')

    await page.goto(`${BASE}/today`)
    await page.waitForTimeout(1800)

    // diagnóstico: variáveis de tema resolvidas + nº de colunas do board + sem faixa vazia
    const diag = await page.evaluate(() => {
      const root = document.querySelector('.today-v3-layout')
      const navy = root ? getComputedStyle(root).getPropertyValue('--navy').trim() : ''
      const board = document.querySelector('.today-v3-layout .board')
      const cols = board ? getComputedStyle(board).gridTemplateColumns : ''
      const rows = document.querySelectorAll('.today-v3-layout .row').length
      const activeDay = document.querySelector('.today-v3-layout .day.active')?.textContent?.trim()
      return { navy, cols, rows, activeDay }
    })
    console.log('DIAG', JSON.stringify(diag))

    await shot('desktop-today-v3')
    console.log('shot desktop')

    await page.setViewportSize(MOBILE)
    await page.goto(`${BASE}/today`)
    await page.waitForTimeout(1500)
    await shot('mobile-today-v3')
    console.log('shot mobile')
  } catch (err) {
    console.log('ERRO:', err.message)
    process.exitCode = 1
  } finally {
    await browser.close()
  }
})()
