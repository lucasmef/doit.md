import { chromium } from 'playwright'

const BASE = 'http://127.0.0.1:3000'
const OUT = process.env.OUT_DIR || 'specs/artifacts/2026-05-28-corrigir-fluxos-navegacao-calendario-notas'

function iso(offsetMinutes) {
  return new Date(Date.now() + offsetMinutes * 60000).toISOString()
}
function todayKey() {
  return new Date().toISOString().slice(0, 10)
}
function tomorrowKey() {
  return new Date(Date.now() + 86400000).toISOString().slice(0, 10)
}

const log = (...a) => console.log('[validate]', ...a)

;(async () => {
  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  const results = []

  try {
    // 1. Sign up (logs in, redirects to /today)
    const unique = `qa-${Date.now()}`
    await page.goto(`${BASE}/sign-up`)
    await page.fill('input[name="name"]', 'QA Fluxos')
    await page.fill('input[name="email"]', `${unique}@example.invalid`)
    await page.fill('input[name="password"]', 'Password123!')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/today**', { timeout: 20000 })
    log('signed up + logged in')

    // 2. Seed data through the API (browser session cookies)
    const post = async (url, body) => {
      const r = await page.request.post(`${BASE}${url}`, { data: body })
      if (!r.ok()) throw new Error(`${url} -> ${r.status()} ${await r.text()}`)
      return r.json()
    }
    const fTrabalho = (await post('/api/folders', { name: 'Trabalho' })).folder
    const fPessoal = (await post('/api/folders', { name: 'Pessoal' })).folder
    await post('/api/folders', { name: 'Estudos' })
    await post('/api/folders', { name: 'Projetos', parentId: fTrabalho.id })
    log('folders seeded')

    const note = (
      await post('/api/items', {
        title: 'Nota de teste imersiva',
        complexity: 'note',
        status: 'todo',
        folderId: fTrabalho.id,
        contentMd: 'Nota de teste imersiva\n\nConteudo da nota para validar o editor imersivo.',
        tags: ['qa'],
      })
    ).item
    await post('/api/items', {
      title: 'Tarefa de hoje',
      complexity: 'task',
      status: 'todo',
      dueDate: todayKey(),
      folderId: fPessoal.id,
      tags: ['qa'],
    })
    log('items seeded')

    // Local calendar events: one já encerrado (passado), um futuro hoje, um amanhã
    try {
      await post('/api/calendar/events', { title: 'Evento passado', start: iso(-180), end: iso(-120), allDay: false })
      await post('/api/calendar/events', { title: 'Reuniao futura', start: iso(120), end: iso(180), allDay: false })
      await post('/api/calendar/events', { title: 'Evento de amanha', start: `${tomorrowKey()}T10:00:00`, end: `${tomorrowKey()}T11:00:00`, allDay: false })
      log('events seeded')
    } catch (e) {
      log('WARN events seed failed (sem calendario local?):', String(e).slice(0, 160))
    }

    const shot = async (name) => {
      await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false })
      log('screenshot', name)
    }

    // ---------- DESKTOP ----------
    await page.goto(`${BASE}/notas`)
    await page.waitForTimeout(1200)
    const notasUrl = page.url()
    results.push(['notas root sem ?folder (desktop)', !notasUrl.includes('?folder=')])
    await shot('01-notas-root-desktop')

    await page.goto(`${BASE}/upcoming`)
    await page.waitForTimeout(800)
    const calToggleBtn = await page.getByRole('button', { name: 'Calendario', exact: true }).count()
    results.push(['/upcoming sem botao-toggle Calendario', calToggleBtn === 0])
    await shot('07-upcoming-list-desktop')

    // Note routing -> editor imersivo /notas/[id]
    await page.goto(`${BASE}/notas?folder=${fTrabalho.id}`)
    await page.waitForTimeout(1500)
    log('antes do clique:', page.url())
    await page.getByText('Nota de teste imersiva').first().click()
    let immersive = false
    for (let i = 0; i < 16; i++) {
      await page.waitForTimeout(400)
      const p = new URL(page.url()).pathname
      if (/^\/notas\/[^/?]+$/.test(p)) { immersive = true; log(`t+${(i + 1) * 400}ms`, p, '<= imersivo'); break }
      log(`t+${(i + 1) * 400}ms`, p)
    }
    results.push(['nota abre editor imersivo /notas/[id]', immersive])
    await page.waitForTimeout(1500)
    await shot('02-note-immersive-desktop')

    // ---------- MOBILE ----------
    await page.setViewportSize({ width: 390, height: 844 })

    await page.goto(`${BASE}/today`)
    await page.waitForTimeout(1000)
    const bottomNav = await page.locator('nav.fixed').first().count()
    results.push(['menu inferior visivel em /today (mobile)', bottomNav > 0])
    await shot('03-today-mobile-bottomnav')

    await page.goto(`${BASE}/calendar`)
    await page.waitForTimeout(1200)
    // bottom nav deve sumir em /calendar
    const navOnCalendar = await page.locator('nav.fixed.inset-x-3').count()
    results.push(['menu inferior oculto em /calendar (mobile)', navOnCalendar === 0])
    await shot('04-calendar-mobile')

    await page.goto(`${BASE}/notas`)
    await page.waitForTimeout(1000)
    await shot('05-notas-root-mobile')

    // abrir uma pasta e o drawer de pastas
    await page.goto(`${BASE}/notas?folder=${fPessoal.id}`)
    await page.waitForTimeout(1000)
    const pastasBtn = page.getByRole('button', { name: 'Abrir navegador de pastas' })
    const hasPastasBtn = (await pastasBtn.count()) > 0
    results.push(['botao Pastas (drawer) presente no mobile', hasPastasBtn])
    if (hasPastasBtn) {
      await pastasBtn.click()
      await page.waitForTimeout(600)
    }
    await shot('06-notas-drawer-mobile')

    // ---------- summary ----------
    log('--- RESULTADOS ---')
    let ok = true
    for (const [name, pass] of results) {
      log(`${pass ? 'PASS' : 'FAIL'} - ${name}`)
      if (!pass) ok = false
    }
    log(ok ? 'TODOS OS CHECKS PASSARAM' : 'HOUVE FALHAS')
    process.exitCode = ok ? 0 : 2
  } catch (err) {
    console.error('[validate] ERRO:', err)
    try {
      await page.screenshot({ path: `${OUT}/error.png`, fullPage: true })
    } catch {}
    process.exitCode = 1
  } finally {
    await browser.close()
  }
})()
