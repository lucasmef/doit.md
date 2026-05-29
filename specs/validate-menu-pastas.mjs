import { chromium } from 'playwright'

const BASE = 'http://127.0.0.1:3000'
const OUT = process.env.OUT_DIR || 'specs/artifacts/2026-05-29-menu-contexto-pastas'

const log = (...a) => console.log('[menu]', ...a)
const results = []
const check = (name, ok, extra = '') => { results.push({ name, ok }); log(`${ok ? 'PASS' : 'FAIL'} — ${name}${extra ? ` (${extra})` : ''}`) }

;(async () => {
  const browser = await chromium.launch()

  // ---------- DESKTOP: right-click ----------
  const dctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await dctx.newPage()
  const shot = async (n) => page.screenshot({ path: `${OUT}/${n}.png`, fullPage: false })
  try {
    const unique = `qa-menu-${Date.now()}`
    await page.goto(`${BASE}/sign-up`)
    await page.fill('input[name="name"]', 'QA Menu')
    await page.fill('input[name="email"]', `${unique}@example.invalid`)
    await page.fill('input[name="password"]', 'Password123!')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/today**', { timeout: 20000 })
    const post = async (url, body) => {
      const r = await page.request.post(`${BASE}${url}`, { data: body })
      if (!r.ok()) throw new Error(`${url} -> ${r.status()}`)
      return r.json()
    }
    const conteudo = (await post('/api/folders', { name: 'Conteudo' })).folder
    await post('/api/folders', { name: 'Roteiros', parentId: conteudo.id })
    await post('/api/folders', { name: 'Pessoal' })
    await post('/api/items', { title: 'Item de teste', complexity: 'note', status: 'todo', folderId: conteudo.id, contentMd: 'x' })
    log('signed up + seeded')

    await page.goto(`${BASE}/notas`)
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForFunction(() => Array.from(document.querySelectorAll('button')).some((b) => /Conteudo/.test(b.textContent || '')), { timeout: 8000 }).catch(() => {})

    // right-click no card "Conteudo"
    const card = page.getByRole('button', { name: /Conteudo/ }).first()
    const box = await card.boundingBox()
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: 'right' })
    await page.waitForTimeout(500)
    const menu = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('[role="menu"] button')).map((b) => (b.textContent || '').trim())
      const has = (t) => rows.some((r) => r.includes(t))
      return {
        open: Boolean(document.querySelector('[role="menu"]')),
        abrir: has('Abrir'), favoritar: has('Favoritar') || has('Favorita'), subpasta: has('Subpasta'),
        visualizacao: has('Visualização'), renomear: has('Renomear'), mover: has('Mover'),
        agents: has('AGENTS'), copiar: has('Copiar link'), excluir: has('Excluir pasta'),
      }
    })
    check('Desktop: clique direito abre o menu da pasta', menu.open)
    check('Desktop: menu tem todas as ações do mockup', menu.abrir && menu.favoritar && menu.subpasta && menu.visualizacao && menu.renomear && menu.mover && menu.agents && menu.copiar && menu.excluir, JSON.stringify(menu))
    await shot('01-desktop-menu-pasta')

    // submenu "Mover" abre lista com Raiz
    await page.evaluate(() => {
      const row = Array.from(document.querySelectorAll('[role="menu"] button')).find((b) => (b.textContent || '').includes('Mover'))
      row?.click()
    })
    await page.waitForTimeout(300)
    const moveSub = await page.evaluate(() => Array.from(document.querySelectorAll('[role="menu"] button')).some((b) => /Raiz/.test(b.textContent || '')))
    check('Desktop: submenu "Mover" lista destino "Raiz"', moveSub)
    await shot('02-desktop-mover-submenu')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    const closedByEsc = await page.evaluate(() => !document.querySelector('[role="menu"]'))
    check('Desktop: Esc fecha o menu', closedByEsc)

    // Favoritar via menu (efeito observável: aparece seção "Destacadas")
    const card2 = page.getByRole('button', { name: /Pessoal/ }).first()
    const b2 = await card2.boundingBox()
    await page.mouse.click(b2.x + b2.width / 2, b2.y + b2.height / 2, { button: 'right' })
    await page.waitForTimeout(400)
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('[role="menu"] button')).find((b) => /Favoritar|Favorita/.test(b.textContent || ''))
      btn?.click()
    })
    await page.waitForTimeout(600)
    const pinned = await page.evaluate(() => Array.from(document.querySelectorAll('div')).some((d) => d.textContent?.trim() === 'Destacadas'))
    check('Desktop: Favoritar pelo menu cria seção "Destacadas"', pinned)

    // Renomear via menu (usa prompt) — abre, digita, confirma
    const card3 = page.getByRole('button', { name: /Pessoal/ }).first()
    const b3 = await card3.boundingBox()
    await page.mouse.click(b3.x + b3.width / 2, b3.y + b3.height / 2, { button: 'right' })
    await page.waitForTimeout(400)
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('[role="menu"] button')).find((b) => (b.textContent || '').includes('Renomear'))
      btn?.click()
    })
    await page.waitForTimeout(400)
    const promptOpen = await page.evaluate(() => Boolean(document.querySelector('input')) && Array.from(document.querySelectorAll('h2')).some((h) => /Renomear/.test(h.textContent || '')))
    check('Desktop: Renomear abre diálogo de prompt', promptOpen)
    if (promptOpen) {
      await page.fill('[role="dialog"] input', 'Pessoal Renomeada')
      await page.click('[role="dialog"] button[type="submit"]')
      await page.waitForFunction(() => Array.from(document.querySelectorAll('button')).some((b) => /Pessoal Renomeada/.test(b.textContent || '')), { timeout: 8000 }).catch(() => {})
      const renamed = await page.evaluate(() => Array.from(document.querySelectorAll('button')).some((b) => /Pessoal Renomeada/.test(b.textContent || '')))
      check('Desktop: Renomear aplica o novo nome', renamed)
    }
  } catch (err) {
    log('ERRO (desktop):', err.message); results.push({ name: `fatal desktop: ${err.message}`, ok: false })
  }
  await dctx.close()

  // ---------- MOBILE: long press ----------
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })
  const mp = mctx.newPage ? await mctx.newPage() : null
  try {
    const page2 = mp
    const shot2 = async (n) => page2.screenshot({ path: `${OUT}/${n}.png`, fullPage: false })
    const unique = `qa-menu-m-${Date.now()}`
    await page2.goto(`${BASE}/sign-up`)
    await page2.fill('input[name="name"]', 'QA Menu M')
    await page2.fill('input[name="email"]', `${unique}@example.invalid`)
    await page2.fill('input[name="password"]', 'Password123!')
    await page2.click('button[type="submit"]')
    await page2.waitForURL('**/today**', { timeout: 20000 })
    const post = async (url, body) => {
      const r = await page2.request.post(`${BASE}${url}`, { data: body })
      if (!r.ok()) throw new Error(`${url} -> ${r.status()}`)
      return r.json()
    }
    await post('/api/folders', { name: 'Trabalho' })
    await page2.goto(`${BASE}/notas`)
    await page2.waitForLoadState('networkidle').catch(() => {})
    await page2.waitForFunction(() => Array.from(document.querySelectorAll('button')).some((b) => /Trabalho/.test(b.textContent || '')), { timeout: 8000 }).catch(() => {})
    const handle = await page2.evaluateHandle(() => Array.from(document.querySelectorAll('button')).find((b) => /Trabalho/.test(b.textContent || '')))
    const mbox = await handle.asElement()?.boundingBox()
    await handle.asElement().dispatchEvent('pointerdown', { pointerType: 'touch', clientX: mbox.x + 40, clientY: mbox.y + mbox.height / 2, bubbles: true })
    await page2.waitForTimeout(650)
    const sheet = await page2.evaluate(() => {
      const menu = document.querySelector('[role="menu"]')
      const rows = Array.from(document.querySelectorAll('[role="menu"] button')).map((b) => (b.textContent || '').trim())
      return { open: Boolean(menu), excluir: rows.some((r) => r.includes('Excluir pasta')), abrir: rows.some((r) => r.includes('Abrir')) }
    })
    check('Mobile: toque longo abre o action sheet da pasta', sheet.open && sheet.abrir && sheet.excluir)
    await shot2('03-mobile-sheet-pasta')
    // toque simples abre a pasta (recarrega para um card "limpo", sem o long-press anterior)
    await page2.keyboard.press('Escape').catch(() => {})
    await page2.goto(`${BASE}/notas`)
    await page2.waitForLoadState('networkidle').catch(() => {})
    await page2.waitForFunction(() => Array.from(document.querySelectorAll('button')).some((b) => /Trabalho/.test(b.textContent || '')), { timeout: 8000 }).catch(() => {})
    await page2.getByRole('button', { name: /Trabalho/ }).first().click()
    await page2.waitForTimeout(800)
    const opened = await page2.evaluate(() => Array.from(document.querySelectorAll('h1')).some((h) => h.textContent?.trim() === 'Trabalho'))
    check('Mobile: toque simples continua abrindo a pasta', opened)
  } catch (err) {
    log('ERRO (mobile):', err.message); results.push({ name: `fatal mobile: ${err.message}`, ok: false })
  }
  await mctx.close()

  await browser.close()
  const failed = results.filter((r) => !r.ok)
  log('===== RESUMO =====')
  for (const r of results) log(`${r.ok ? '✓' : '✗'} ${r.name}`)
  log(`${results.length - failed.length}/${results.length} checks OK`)
  process.exit(failed.length === 0 ? 0 : 1)
})()
