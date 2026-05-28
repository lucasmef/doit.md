import { test } from '@playwright/test'
import path from 'path'

const REF = path.resolve(__dirname, '../../../docs/doitmd-layout-codex-package/desktop')
const OUT = '../../specs/artifacts/diag'

test('render reference pages', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  for (const [name, file] of [
    ['ref-dashboard', '01-dashboard.html'],
    ['ref-itens', '02-itens.html'],
    ['ref-notas', '03-notas.html'],
  ] as const) {
    await page.goto('file://' + path.join(REF, file).replace(/\\/g, '/'))
    await page.waitForTimeout(800)
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true })
  }
})
