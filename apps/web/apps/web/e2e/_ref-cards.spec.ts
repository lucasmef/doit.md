import { test } from '@playwright/test'
import path from 'path'

const REF = path.resolve(__dirname, '../../../docs/doitmd-layout-codex-package/desktop')
const OUT = '../../specs/artifacts/diag'

test('close up reference cards', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  for (const [name, file, sel] of [
    ['card-live', '01-dashboard.html', '.c-live'],
    ['card-quick', '02-itens.html', '.c-quick'],
    ['card-graph', '03-notas.html', '.c-graph'],
  ] as const) {
    await page.goto('file://' + path.join(REF, file).replace(/\\/g, '/'))
    await page.waitForTimeout(500)
    const el = page.locator(sel).first()
    await el.screenshot({ path: `${OUT}/${name}.png` })
    const bg = await el.evaluate((node) => {
      const cs = getComputedStyle(node)
      return { background: cs.backgroundImage, color: cs.color, boxShadow: cs.boxShadow, border: cs.border }
    })
    console.log(name, JSON.stringify(bg))
  }
})
