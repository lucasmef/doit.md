import { chromium } from 'playwright'

const BASE = 'http://127.0.0.1:3000'
const OUT = process.env.OUT_DIR || 'specs/artifacts/2026-05-29-reajustes-mobile-calendario-notas-modais'
const MOBILE = { width: 390, height: 844 }
const DESKTOP = { width: 1440, height: 900 }

const log = (...a) => console.log('[validate]', ...a)
const results = []
function check(name, ok, extra = '') {
  results.push({ name, ok })
  log(`${ok ? 'PASS' : 'FAIL'} — ${name}${extra ? ` (${extra})` : ''}`)
}
function todayKey() {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

;(async () => {
  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: DESKTOP, hasTouch: true })
  const page = await context.newPage()

  try {
    // --- Sign up (local auth, no Google needed) ---
    const unique = `qa-reaj-${Date.now()}`
    await page.goto(`${BASE}/sign-up`)
    await page.fill('input[name="name"]', 'QA Reajustes')
    await page.fill('input[name="email"]', `${unique}@example.invalid`)
    await page.fill('input[name="password"]', 'Password123!')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/today**', { timeout: 20000 })
    log('signed up + logged in')

    const post = async (url, body) => {
      const r = await page.request.post(`${BASE}${url}`, { data: body })
      if (!r.ok()) throw new Error(`${url} -> ${r.status()} ${await r.text()}`)
      return r.json()
    }

    // --- Seed ---
    // ID 008: pasta só com subpastas
    const arquivo = (await post('/api/folders', { name: 'Arquivo Morto' })).folder
    const sub2024 = (await post('/api/folders', { name: '2024', parentId: arquivo.id })).folder
    // ID 013 + geral: pasta com notas/itens
    const trabalho = (await post('/api/folders', { name: 'Trabalho' })).folder

    await post('/api/items', {
      title: 'Relatorio anual de fechamento do projeto',
      complexity: 'note',
      status: 'todo',
      folderId: sub2024.id,
      contentMd: 'Conteudo da nota dentro da subpasta 2024 para validar navegacao.',
      tags: ['qa'],
    })
    await post('/api/items', {
      title: 'Planejamento estrategico do trimestre',
      complexity: 'note',
      status: 'todo',
      folderId: trabalho.id,
      contentMd: 'Planejamento estrategico do trimestre\n\nTrecho longo de preview que so deve aparecer no desktop.',
      tags: ['qa'],
    })
    // ID 005: item com titulo longo no dia de hoje (vira chip no calendario)
    await post('/api/items', {
      title: 'Reuniao de alinhamento com a equipe de produto',
      complexity: 'task',
      status: 'todo',
      dueDate: todayKey(),
      folderId: trabalho.id,
      tags: [],
    })
    // ID 011: tarefa de hoje SEM horario e tarefa de hoje COM horario
    await post('/api/items', {
      title: 'Tarefa sem horario hoje',
      complexity: 'task',
      status: 'todo',
      dueDate: todayKey(),
      tags: [],
    })
    await post('/api/items', {
      title: 'Tarefa com horario hoje',
      complexity: 'task',
      status: 'todo',
      dueDate: todayKey(),
      dueTime: '14:30',
      tags: [],
    })
    log('seeded folders + items')

    const shot = async (name) => {
      await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false })
    }

    // ===== ID 012: titulo "Calendário" =====
    await page.setViewportSize(MOBILE)
    await page.goto(`${BASE}/calendar`)
    await page.waitForTimeout(1200)
    const hasAccentTitle = await page.evaluate(() =>
      Array.from(document.querySelectorAll('body *')).some(
        (el) => el.children.length === 0 && el.textContent?.trim() === 'Calendário',
      ),
    )
    const hasUnaccentedNav = await page.evaluate(() =>
      Array.from(document.querySelectorAll('a,button,span,h1,h2'))
        .some((el) => el.children.length === 0 && el.textContent?.trim() === 'Calendario'),
    )
    check('ID012 título "Calendário" presente (mobile)', hasAccentTitle)
    check('ID012 sem "Calendario" sem acento na nav', !hasUnaccentedNav)
    await shot('01-calendar-mobile-mes')

    // ===== ID 005: chip do calendario quebra em 2 linhas (sem iniciais) =====
    await page
      .waitForFunction(
        () => Array.from(document.querySelectorAll('span[title]')).some((s) => s.className.includes('line-clamp-2')),
        { timeout: 8000 },
      )
      .catch(() => {})
    const chip = await page.evaluate(() => {
      const chips = Array.from(document.querySelectorAll('span[title]')).filter((s) =>
        s.className.includes('line-clamp-2'),
      )
      if (chips.length === 0) return null
      const sample = chips[0]
      return {
        count: chips.length,
        text: sample.textContent?.trim(),
        title: sample.getAttribute('title'),
        full: sample.textContent?.trim() === sample.getAttribute('title'),
        wrap: sample.className.includes('whitespace-normal'),
        desktopTruncate: sample.className.includes('lg:truncate'),
      }
    })
    check('ID005 mês mobile renderiza chip de evento/item', Boolean(chip && chip.count > 0), chip ? `${chip.count} chips` : 'nenhum chip')
    check('ID005 chip mostra título completo (sem iniciais)', Boolean(chip?.full), chip ? chip.text : '')
    check('ID005 chip quebra em 2 linhas no mobile + truncate no desktop', Boolean(chip?.wrap && chip?.desktopTruncate))

    // ===== ID 013: lista de notas no mobile só com título =====
    await page.goto(`${BASE}/notas?folder=${trabalho.id}`)
    await page.waitForLoadState('networkidle').catch(() => {})
    await page
      .waitForFunction(
        () => Array.from(document.querySelectorAll('span')).some((s) => (s.textContent || '').includes('Planejamento estrategico')),
        { timeout: 8000 },
      )
      .catch(() => {})
    const rowInfo = await page.evaluate(() => {
      const titleEl = Array.from(document.querySelectorAll('span')).find(
        (s) => (s.textContent || '').trim() === 'Planejamento estrategico do trimestre',
      )
      if (!titleEl) return null
      // segunda linha = irmão seguinte (preview tipo · trecho)
      const sib = titleEl.nextElementSibling
      const sibVisible = sib ? sib.getBoundingClientRect().height > 0 && getComputedStyle(sib).display !== 'none' : false
      const titleFullyVisible = titleEl.getBoundingClientRect().width > 60
      return { hasTitle: true, previewVisible: sibVisible, titleFullyVisible }
    })
    check('ID013 título da nota visível na lista (mobile)', Boolean(rowInfo?.hasTitle && rowInfo?.titleFullyVisible))
    check('ID013 preview/trecho oculto no mobile', rowInfo ? rowInfo.previewVisible === false : false)
    await shot('02-notas-lista-mobile')

    // ===== ID 008: pasta só com subpastas é navegável =====
    await page.goto(`${BASE}/notas`)
    await page.waitForTimeout(1000)
    // abrir a pasta "Arquivo Morto" (só tem subpasta)
    await page.getByRole('button', { name: /Arquivo Morto/ }).first().click()
    await page.waitForTimeout(900)
    const subVisible = await page.evaluate(() =>
      Array.from(document.querySelectorAll('button')).some((b) => /\b2024\b/.test(b.textContent || '')),
    )
    check('ID008 subpasta "2024" aparece clicável na pasta só-subpastas', subVisible)
    await shot('03-notas-pasta-so-subpastas-mobile')
    if (subVisible) {
      await page.getByRole('button', { name: /2024/ }).first().click()
      await page.waitForTimeout(900)
      const inSub = await page.evaluate(() =>
        Array.from(document.querySelectorAll('span,button')).some((el) => el.textContent?.trim() === '2024') &&
        Array.from(document.querySelectorAll('h1')).some((h) => h.textContent?.trim() === '2024'),
      )
      check('ID008 navegou para dentro da subpasta 2024', inSub)
      await shot('04-notas-dentro-subpasta-mobile')
      // voltar via breadcrumb "Notas"
      await page.getByRole('button', { name: 'Notas' }).first().click()
      await page.waitForTimeout(800)
      const backRoot = await page.evaluate(() =>
        Array.from(document.querySelectorAll('h1')).some((h) => h.textContent?.trim() === 'Pastas'),
      )
      check('ID008 voltar/subir nível leva à raiz de Notas', backRoot)
    }

    // ===== ID 009: long press abre menu (nota e tarefa) =====
    await page.goto(`${BASE}/notas?folder=${trabalho.id}`)
    await page.waitForLoadState('networkidle').catch(() => {})
    await page
      .waitForFunction(
        () => Array.from(document.querySelectorAll('button')).some((b) => (b.textContent || '').includes('Planejamento estrategico')),
        { timeout: 8000 },
      )
      .catch(() => {})
    const longPress = async (selectorText) => {
      const handle = await page.evaluateHandle((txt) => {
        const el = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').includes(txt))
        return el
      }, selectorText)
      const box = await handle.asElement()?.boundingBox()
      if (!box) return false
      const x = box.x + box.width / 2
      const y = box.y + box.height / 2
      await handle.asElement().dispatchEvent('pointerdown', { pointerType: 'touch', clientX: x, clientY: y, bubbles: true })
      await page.waitForTimeout(650)
      const open = await page.evaluate(() =>
        Array.from(document.querySelectorAll('button')).some((b) => b.textContent?.trim() === 'Mover para pasta'),
      )
      if (open) await shot('05-longpress-nota-menu-mobile')
      // limpar: tocar fora / Esc
      await page.keyboard.press('Escape').catch(() => {})
      await page.waitForTimeout(300)
      return open
    }
    const noteMenu = await longPress('Planejamento estrategico')
    check('ID009 long press em NOTA abre menu de ações', noteMenu)

    // ===== ID 011: página Hoje mobile badges =====
    await page.goto(`${BASE}/today`)
    await page.waitForTimeout(1500)
    const todayBadges = await page.evaluate(() => {
      const articles = Array.from(document.querySelectorAll('article'))
      const noTime = articles.find((a) => (a.textContent || '').includes('Tarefa sem horario hoje'))
      const withTime = articles.find((a) => (a.textContent || '').includes('Tarefa com horario hoje'))
      const hasHojeBadge = (a) =>
        a && Array.from(a.querySelectorAll('div')).some((d) => d.textContent?.trim() === 'hoje')
      const showsTime = (a) =>
        a && Array.from(a.querySelectorAll('div')).some((d) => d.textContent?.trim() === '14:30')
      return {
        noTimeFound: Boolean(noTime),
        noTimeHasHoje: hasHojeBadge(noTime),
        withTimeFound: Boolean(withTime),
        withTimeShowsTime: showsTime(withTime),
      }
    })
    check('ID011 tarefa sem horário NÃO mostra badge "hoje"', todayBadges.noTimeFound && !todayBadges.noTimeHasHoje)
    check('ID011 tarefa com horário mostra o horário (14:30)', todayBadges.withTimeFound && todayBadges.withTimeShowsTime)
    await shot('06-today-mobile-badges')

    // long press em TAREFA na Hoje
    const taskHandle = await page.evaluateHandle(() =>
      Array.from(document.querySelectorAll('article')).find((a) => (a.textContent || '').includes('Tarefa com horario hoje')),
    )
    const tbox = await taskHandle.asElement()?.boundingBox()
    if (tbox) {
      await taskHandle.asElement().dispatchEvent('pointerdown', { pointerType: 'touch', clientX: tbox.x + 40, clientY: tbox.y + tbox.height / 2, bubbles: true })
      await page.waitForTimeout(650)
      const taskMenu = await page.evaluate(() =>
        Array.from(document.querySelectorAll('button')).some((b) => b.textContent?.trim() === 'Mover para pasta'),
      )
      check('ID009 long press em TAREFA (Hoje) abre menu de ações', taskMenu)
      if (taskMenu) await shot('07-longpress-tarefa-menu-mobile')
      await page.keyboard.press('Escape').catch(() => {})
      await page.waitForTimeout(300)
    }

    // ===== ID 010: Esc fecha modal sem foco interno =====
    // Abrir prompt "Nova pasta" (diálogo) e fechar com Esc após blur do foco
    await page.goto(`${BASE}/notas`)
    await page.waitForTimeout(1000)
    await page.getByRole('button', { name: 'Nova pasta' }).first().click()
    await page.waitForTimeout(500)
    const dialogOpen = await page.evaluate(() => Boolean(document.querySelector('[role="dialog"]')))
    // tira o foco do input do modal
    await page.evaluate(() => {
      const ae = document.activeElement
      if (ae && ae.blur) ae.blur()
      document.body.focus?.()
    })
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
    const dialogClosed = await page.evaluate(() => !document.querySelector('[role="dialog"]'))
    check('ID010 Esc fecha diálogo mesmo sem foco interno', dialogOpen && dialogClosed)

    // ===== Desktop: sem regressão no calendário =====
    await page.setViewportSize(DESKTOP)
    await page.goto(`${BASE}/calendar`)
    await page.waitForTimeout(1500)
    await page
      .waitForFunction(
        () => Array.from(document.querySelectorAll('span[title]')).some((s) => s.className.includes('lg:truncate')),
        { timeout: 8000 },
      )
      .catch(() => {})
    const desktopChipTruncates = await page.evaluate(() =>
      Array.from(document.querySelectorAll('span[title]')).some((s) => s.className.includes('lg:truncate')),
    )
    check('Desktop calendário mantém truncate no chip (sem regressão)', desktopChipTruncates)
    await shot('08-calendar-desktop')

    await page.goto(`${BASE}/notas?folder=${trabalho.id}`)
    await page.waitForLoadState('networkidle').catch(() => {})
    await page
      .waitForFunction(
        () => Array.from(document.querySelectorAll('span')).some((s) => (s.textContent || '').includes('Planejamento estrategico')),
        { timeout: 8000 },
      )
      .catch(() => {})
    const desktopPreview = await page.evaluate(() => {
      const titleEl = Array.from(document.querySelectorAll('span')).find(
        (s) => (s.textContent || '').trim() === 'Planejamento estrategico do trimestre',
      )
      const sib = titleEl?.nextElementSibling
      return sib ? sib.getBoundingClientRect().height > 0 && getComputedStyle(sib).display !== 'none' : false
    })
    check('Desktop lista de notas mantém preview/trecho (sem regressão)', desktopPreview)
    await shot('09-notas-lista-desktop')
  } catch (err) {
    log('ERRO FATAL:', err.message)
    results.push({ name: `fatal: ${err.message}`, ok: false })
  } finally {
    await browser.close()
    const failed = results.filter((r) => !r.ok)
    log('===== RESUMO =====')
    for (const r of results) log(`${r.ok ? '✓' : '✗'} ${r.name}`)
    log(`${results.length - failed.length}/${results.length} checks OK`)
    process.exit(failed.length === 0 ? 0 : 1)
  }
})()
