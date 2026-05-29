import { chromium } from 'playwright'

const BASE = 'http://127.0.0.1:3000'
const OUT = process.env.OUT_DIR || 'specs/artifacts/2026-05-29-reajustes-mobile-v2-calendario-notas-quickadd'
const MOBILE = { width: 390, height: 844 }
const DESKTOP = { width: 1440, height: 900 }

const log = (...a) => console.log('[v2]', ...a)
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
  const context = await browser.newContext({ viewport: MOBILE, hasTouch: true })
  const page = await context.newPage()
  const shot = async (n) => page.screenshot({ path: `${OUT}/${n}.png`, fullPage: false })

  try {
    const unique = `qa-v2-${Date.now()}`
    await page.goto(`${BASE}/sign-up`)
    await page.fill('input[name="name"]', 'QA V2')
    await page.fill('input[name="email"]', `${unique}@example.invalid`)
    await page.fill('input[name="password"]', 'Password123!')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/today**', { timeout: 20000 })
    log('signed up')

    const post = async (url, body) => {
      const r = await page.request.post(`${BASE}${url}`, { data: body })
      if (!r.ok()) throw new Error(`${url} -> ${r.status()} ${await r.text()}`)
      return r.json()
    }

    // Seed
    const arquivo = (await post('/api/folders', { name: 'Arquivo Morto' })).folder
    await post('/api/folders', { name: '2024', parentId: arquivo.id })
    const trabalho = (await post('/api/folders', { name: 'Trabalho' })).folder
    await post('/api/items', { title: 'Planejamento do trimestre', complexity: 'note', status: 'todo', folderId: trabalho.id, contentMd: 'Planejamento do trimestre\n\nTrecho que so aparece no desktop.', tags: ['qa'] })
    await post('/api/items', { title: 'Revisar contrato com fornecedor', complexity: 'task', status: 'todo', folderId: trabalho.id, tags: [] })
    // 4 itens hoje p/ testar "+X mais" no mês e badges na Hoje
    await post('/api/items', { title: 'Reuniao de alinhamento com produto', complexity: 'task', status: 'todo', dueDate: todayKey(), dueTime: '14:30', tags: [] })
    await post('/api/items', { title: 'Tarefa sem horario hoje', complexity: 'task', status: 'todo', dueDate: todayKey(), tags: [] })
    await post('/api/items', { title: 'Almoco com cliente importante', complexity: 'task', status: 'todo', dueDate: todayKey(), dueTime: '12:00', tags: [] })
    await post('/api/items', { title: 'Escrever relatorio mensal detalhado', complexity: 'task', status: 'todo', dueDate: todayKey(), tags: [] })
    log('seeded')

    // ===== ID 005: calendário mês ocupa altura + "+X mais" =====
    await page.goto(`${BASE}/calendar`)
    await page.waitForTimeout(1200)
    await page
      .waitForFunction(() => Array.from(document.querySelectorAll('span[title]')).some((s) => s.className.includes('line-clamp-2')), { timeout: 8000 })
      .catch(() => {})
    const calFill = await page.evaluate(() => {
      const root = document.querySelector('main')?.firstElementChild
      if (!root) return null
      const r = root.getBoundingClientRect()
      return { bottom: Math.round(r.bottom), vh: window.innerHeight }
    })
    check('ID005 calendário ocupa a altura (pouco branco embaixo)', Boolean(calFill && calFill.vh - calFill.bottom < 80), calFill ? `bottom=${calFill.bottom}/vh=${calFill.vh}` : 'sem root')
    const moreBlock = await page.evaluate(() =>
      Array.from(document.querySelectorAll('span')).some((s) => /^\+\d+\s*mais$/.test((s.textContent || '').trim())),
    )
    check('ID005 indicador "+X mais" presente quando há eventos extras', moreBlock)
    await shot('01-calendar-mes-mobile')

    // ===== ID 014: semana com swipe (3 dias) =====
    await page.getByRole('button', { name: 'SEM' }).first().click()
    await page.waitForTimeout(900)
    const week = await page.evaluate(() => {
      // container da semana = div com overflow-x auto/scroll e >=5 filhos (os dias)
      const containers = Array.from(document.querySelectorAll('div')).filter((d) => {
        const s = getComputedStyle(d)
        return (s.overflowX === 'auto' || s.overflowX === 'scroll') && d.children.length >= 5
      })
      const container = containers.find((c) => c.scrollWidth > c.clientWidth + 4) || containers[0]
      if (!container) return null
      const cw = container.clientWidth
      const dayW = container.firstElementChild?.getBoundingClientRect().width ?? 0
      return { scrollable: container.scrollWidth > container.clientWidth + 4, overflowX: getComputedStyle(container).overflowX, ratio: dayW / cw }
    })
    check('ID014 semana mobile é rolável horizontalmente', Boolean(week && (week.scrollable || week.overflowX === 'auto' || week.overflowX === 'scroll')), week ? `overflowX=${week.overflowX} ratio=${week.ratio?.toFixed(2)}` : 'sem container')
    check('ID014 cada dia ocupa ~1/3 (colunas não estreitas)', Boolean(week && week.ratio > 0.22 && week.ratio < 0.45), week ? `ratio=${week.ratio?.toFixed(2)}` : '')
    await shot('02-calendar-semana-mobile')

    // ===== ID 008: sem scroll duplo na área de notas =====
    await page.goto(`${BASE}/notas?folder=${trabalho.id}`)
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(800)
    const noDoubleScroll = await page.evaluate(() => {
      // procura algum container interno (não body) que role verticalmente dentro da área de notas
      const scrollers = Array.from(document.querySelectorAll('section div')).filter((d) => {
        const s = getComputedStyle(d)
        return (s.overflowY === 'auto' || s.overflowY === 'scroll') && d.scrollHeight > d.clientHeight + 4
      })
      return scrollers.length === 0
    })
    check('ID008 sem scroll vertical aninhado no mobile (scroll único)', noDoubleScroll)

    // ===== ID 013: lista só título + ícone discreto =====
    const listInfo = await page.evaluate(() => {
      const noteTitle = Array.from(document.querySelectorAll('span')).find((s) => s.textContent?.trim() === 'Planejamento do trimestre')
      const taskTitle = Array.from(document.querySelectorAll('span')).find((s) => s.textContent?.trim() === 'Revisar contrato com fornecedor')
      const previewVisible = (el) => {
        const sib = el?.nextElementSibling
        return sib ? getComputedStyle(sib).display !== 'none' : false
      }
      // ícone discreto = svg dentro do span-ícone (irmão anterior do bloco de título)
      const iconOf = (titleEl) => {
        const row = titleEl?.closest('button')
        const svg = row?.querySelector('svg')
        return svg ? svg.outerHTML.length : 0
      }
      return {
        noteFound: Boolean(noteTitle),
        taskFound: Boolean(taskTitle),
        notePreview: previewVisible(noteTitle),
        taskPreview: previewVisible(taskTitle),
        noteIcon: iconOf(noteTitle),
        taskIcon: iconOf(taskTitle),
      }
    })
    check('ID013 lista mostra título da nota e da tarefa', listInfo.noteFound && listInfo.taskFound)
    check('ID013 sem preview/rótulo abaixo no mobile', !listInfo.notePreview && !listInfo.taskPreview)
    check('ID013 ícones discretos diferentes p/ nota e tarefa', listInfo.noteIcon > 0 && listInfo.taskIcon > 0 && listInfo.noteIcon !== listInfo.taskIcon)
    await shot('03-notas-lista-mobile')

    // ===== ID 016: header mobile simplificado =====
    const header = await page.evaluate(() => {
      const counters = Array.from(document.querySelectorAll('span')).filter((s) => /^\d+\s+(item|itens|subpasta|subpastas)$/.test((s.textContent || '').trim()) && s.getBoundingClientRect().height > 0)
      const kebab = document.querySelector('[aria-label="Ações da pasta"]')
      const topNovoVisible = Array.from(document.querySelectorAll('button')).some((b) => (b.textContent || '').trim() === 'Novo item' && b.getBoundingClientRect().height > 0)
      const endNovoVisible = Array.from(document.querySelectorAll('button')).some((b) => /\+\s*Novo item/.test(b.textContent || '') && b.getBoundingClientRect().height > 0)
      return { counters: counters.length, kebab: Boolean(kebab), topNovoVisible, endNovoVisible }
    })
    check('ID016 sem contadores no header mobile', header.counters === 0, `counters=${header.counters}`)
    check('ID016 menu kebab presente no mobile', header.kebab)
    check('ID016 sem botão "Novo item" no topo (mobile)', !header.topNovoVisible)
    check('ID016 botão "Novo item" contextual no fim da lista', header.endNovoVisible)
    // abrir o kebab p/ evidência
    await page.locator('[aria-label="Ações da pasta"]').first().click().catch(() => {})
    await page.waitForTimeout(400)
    await shot('04-notas-header-kebab-mobile')
    await page.keyboard.press('Escape').catch(() => {})

    // ===== ID 008: pasta só-subpastas navegável (regressão) =====
    await page.goto(`${BASE}/notas`)
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForFunction(() => Array.from(document.querySelectorAll('button')).some((b) => /Arquivo Morto/.test(b.textContent || '')), { timeout: 8000 }).catch(() => {})
    await page.getByRole('button', { name: /Arquivo Morto/ }).first().click()
    await page.waitForFunction(() => Array.from(document.querySelectorAll('button')).some((b) => /\b2024\b/.test(b.textContent || '')), { timeout: 8000 }).catch(() => {})
    await shot('11-arquivo-morto-subpastas')
    const subClickable = await page.evaluate(() => {
      const hasSubLabel = Array.from(document.querySelectorAll('div')).some((d) => d.textContent?.trim() === 'Subpastas')
      const subBtn = Array.from(document.querySelectorAll('button')).some((b) => /2024/.test(b.textContent || ''))
      return hasSubLabel && subBtn
    })
    check('ID008 pasta só-subpastas mostra subpasta clicável', subClickable)

    // ===== ID 011: Hoje — item sem horário alinhado (sem coluna vazia) =====
    await page.goto(`${BASE}/today`)
    await page.waitForTimeout(1500)
    const todayLayout = await page.evaluate(() => {
      const articles = Array.from(document.querySelectorAll('article'))
      const noTime = articles.find((a) => (a.textContent || '').includes('Tarefa sem horario hoje'))
      const withTime = articles.find((a) => (a.textContent || '').includes('Reuniao de alinhamento'))
      const cols = (a) => (a ? getComputedStyle(a).gridTemplateColumns : '')
      const firstTrackPx = (a) => {
        const c = cols(a)
        const first = c.split(' ')[0]
        return parseFloat(first)
      }
      const showsTime = (a) => a && Array.from(a.querySelectorAll('div')).some((d) => d.textContent?.trim() === '14:30')
      const hojeBadge = (a) => a && Array.from(a.querySelectorAll('div')).some((d) => d.textContent?.trim() === 'hoje')
      return {
        noTimeFound: Boolean(noTime),
        noTimeFirstTrack: firstTrackPx(noTime),
        noTimeCols: cols(noTime).split(' ').length,
        noTimeHoje: hojeBadge(noTime),
        withTimeShowsTime: showsTime(withTime),
      }
    })
    check('ID011 item sem horário não tem coluna vazia fixa à esquerda', todayLayout.noTimeFound && todayLayout.noTimeFirstTrack < 40 && todayLayout.noTimeCols === 2, `track1=${Math.round(todayLayout.noTimeFirstTrack)}px cols=${todayLayout.noTimeCols}`)
    check('ID011 item sem horário sem badge "hoje"', todayLayout.noTimeFound && !todayLayout.noTimeHoje)
    check('ID011 item com horário exibe horário', todayLayout.withTimeShowsTime)
    await shot('05-today-mobile')

    // ===== ID 015: quick add mobile =====
    await page.keyboard.press('q')
    await page.waitForTimeout(700)
    const quick = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]')
      if (!dialog) return null
      // painel = filho com bg branco
      const panels = Array.from(dialog.querySelectorAll('div')).filter((d) => /rounded-t-\[30px\]/.test(d.className))
      const panel = panels[0]
      const panelBg = panel ? getComputedStyle(panel).backgroundColor : ''
      // abas
      const tabs = Array.from(dialog.querySelectorAll('button')).filter((b) => ['Tarefa', 'Nota', 'Evento'].includes((b.textContent || '').trim()))
      const tabsContainer = tabs[0]?.parentElement
      const containerW = tabsContainer ? tabsContainer.getBoundingClientRect().width : 0
      const panelW = panel ? panel.getBoundingClientRect().width : 1
      const active = document.activeElement
      const inputFocused = active && active.tagName === 'INPUT'
      return {
        panelBg,
        tabsCount: tabs.length,
        tabsFull: containerW / panelW > 0.8,
        inputFocused: Boolean(inputFocused),
      }
    })
    check('ID015 quick add abre no mobile', Boolean(quick))
    if (quick) {
      const opaque = quick.panelBg === 'rgb(255, 255, 255)'
      check('ID015 painel com fundo esbranquiçado/opaco', opaque, quick.panelBg)
      check('ID015 abas (nota/tarefa/evento) em largura cheia', quick.tabsCount === 3 && quick.tabsFull)
      check('ID015 input recebe foco automático', quick.inputFocused)
    }
    await shot('06-quickadd-mobile')
    await page.keyboard.press('Escape').catch(() => {})
    await page.waitForTimeout(300)

    // ===== ID 009: long press (nota + tarefa) =====
    const longPress = async (gotoUrl, text, shotName) => {
      await page.goto(gotoUrl)
      await page.waitForLoadState('networkidle').catch(() => {})
      await page.waitForFunction((t) => Array.from(document.querySelectorAll('article,button')).some((e) => (e.textContent || '').includes(t)), text, { timeout: 8000 }).catch(() => {})
      const handle = await page.evaluateHandle((t) => Array.from(document.querySelectorAll('article,button')).find((e) => (e.textContent || '').includes(t)), text)
      const box = await handle.asElement()?.boundingBox()
      if (!box) return false
      await handle.asElement().dispatchEvent('pointerdown', { pointerType: 'touch', clientX: box.x + 30, clientY: box.y + box.height / 2, bubbles: true })
      await page.waitForTimeout(650)
      const open = await page.evaluate(() => Array.from(document.querySelectorAll('button')).some((b) => b.textContent?.trim() === 'Mover para pasta'))
      if (open && shotName) await shot(shotName)
      await page.keyboard.press('Escape').catch(() => {})
      await page.waitForTimeout(250)
      return open
    }
    check('ID009 long press em NOTA abre menu', await longPress(`${BASE}/notas?folder=${trabalho.id}`, 'Planejamento do trimestre', '07-longpress-nota'))
    check('ID009 long press em TAREFA abre menu', await longPress(`${BASE}/today`, 'Reuniao de alinhamento', '08-longpress-tarefa'))

    // ===== ID 010: Esc fecha modal sem foco =====
    await page.goto(`${BASE}/notas`)
    await page.waitForTimeout(800)
    await page.getByRole('button', { name: 'Nova pasta' }).first().click()
    await page.waitForTimeout(400)
    const dlgOpen = await page.evaluate(() => Boolean(document.querySelector('[role="dialog"]')))
    await page.evaluate(() => { document.activeElement?.blur?.(); document.body.focus?.() })
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
    const dlgClosed = await page.evaluate(() => !document.querySelector('[role="dialog"]'))
    check('ID010 Esc fecha diálogo sem foco interno', dlgOpen && dlgClosed)

    // ===== Desktop: sem regressão =====
    await page.setViewportSize(DESKTOP)
    await page.goto(`${BASE}/notas?folder=${trabalho.id}`)
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(800)
    const desktopOk = await page.evaluate(() => {
      const noteTitle = Array.from(document.querySelectorAll('span')).find((s) => s.textContent?.trim() === 'Planejamento do trimestre')
      const sib = noteTitle?.nextElementSibling
      const previewVisible = sib ? getComputedStyle(sib).display !== 'none' : false
      const counters = Array.from(document.querySelectorAll('span')).some((s) => /^\d+\s+(itens?|subpastas?)$/.test((s.textContent || '').trim()) && s.getBoundingClientRect().height > 0)
      return { previewVisible, counters }
    })
    check('Desktop lista mantém preview/trecho (sem regressão)', desktopOk.previewVisible)
    check('Desktop mantém contadores no header (sem regressão)', desktopOk.counters)
    await shot('09-notas-desktop')
    await page.goto(`${BASE}/calendar`)
    await page.waitForTimeout(1200)
    await shot('10-calendar-desktop')
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
