import { createRequire } from 'node:module'
import fs from 'node:fs'
const req = createRequire(new URL('../apps/web/package.json', import.meta.url))
const { chromium } = req('playwright')
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
const msgs = []
page.on('console', m => msgs.push(`[${m.type()}] ${m.text()}`))
page.on('response', r => { if (!r.ok()) msgs.push(`HTTP ${r.status()} ${r.url()}`) })
const unique = `qa-test-${Date.now()}`
await page.goto('http://127.0.0.1:3400/sign-up')
await page.waitForLoadState('networkidle')
await page.fill('input[name="name"]', 'QA Test')
await page.fill('input[name="email"]', `${unique}@example.invalid`)
await page.fill('input[name="password"]', 'Password123!')
await page.click('button[type="submit"]')
await page.waitForTimeout(8000)
await page.screenshot({ path: 'specs/artifacts/debug-signup-after.png' })
console.log('URL after submit:', page.url())
console.log('Console msgs:', msgs.slice(-10).join('\n'))
await browser.close()
