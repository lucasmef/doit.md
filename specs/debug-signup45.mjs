import { createRequire } from 'node:module'
const req = createRequire(new URL('../apps/web/package.json', import.meta.url))
const { chromium } = req('playwright')
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
const errors = []
page.on('response', r => { if (!r.ok() && !r.url().includes('_next')) errors.push(`${r.status()} ${r.url()}`) })
const unique = `qa-${Date.now()}`
await page.goto('http://127.0.0.1:3400/sign-up')
await page.waitForLoadState('networkidle')
await page.fill('input[name="name"]', 'QA Prints')
await page.fill('input[name="email"]', `${unique}@example.invalid`)
await page.fill('input[name="password"]', 'Password123!')
await page.click('button[type="submit"]')
// Wait up to 45s for redirect
let redirected = false
for (let i = 0; i < 45; i++) {
  await page.waitForTimeout(1000)
  const url = page.url()
  if (url.includes('/today') || url.includes('/inbox')) { redirected = true; break }
}
console.log('Final URL:', page.url())
console.log('Redirected:', redirected)
console.log('Errors:', errors.join('; '))
await page.screenshot({ path: 'specs/artifacts/debug-signup-45s.png' })
await browser.close()
