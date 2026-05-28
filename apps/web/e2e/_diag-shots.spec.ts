import { test } from '@playwright/test'

const SHOT_DIR = '../../specs/artifacts/diag'

test('diagnose layout issues', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })

  // sign up
  await page.goto('/sign-up')
  const unique = `diag-${Date.now()}`
  await page.fill('input[name="name"]', 'Diag')
  await page.fill('input[name="email"]', `${unique}@example.invalid`)
  await page.fill('input[name="password"]', 'Password123!')
  await page.click('button[type="submit"]')
  await page.waitForURL('**/today**')

  const today = new Date().toISOString().slice(0, 10)

  // seed items so board columns fill and lists overflow
  const seeds: Array<Record<string, unknown>> = []
  for (let i = 0; i < 6; i++) {
    seeds.push({ title: `due task ${i + 1}`, complexity: 'task', status: 'todo', dueDate: today, tags: ['review'] })
  }
  for (let i = 0; i < 6; i++) {
    seeds.push({ title: `backlog task ${i + 1}`, complexity: 'task', status: 'todo', tags: ['backlog'] })
  }
  for (let i = 0; i < 4; i++) {
    seeds.push({ title: `doing task ${i + 1}`, complexity: 'task', status: 'doing', dueDate: today, tags: ['wip'] })
  }
  for (let i = 0; i < 4; i++) {
    seeds.push({ title: `done task ${i + 1}`, complexity: 'task', status: 'done', tags: ['shipped'] })
  }
  for (const body of seeds) {
    const res = await page.request.post('/api/items', { data: body })
    if (!res.ok()) console.log('seed failed', res.status(), await res.text())
  }

  for (const [name, path] of [
    ['dashboard', '/dashboard'],
    ['today', '/today'],
    ['notas', '/notas'],
  ] as const) {
    await page.goto(path)
    await page.waitForTimeout(1500)
    await page.screenshot({ path: `${SHOT_DIR}/${name}-viewport.png` })
    await page.screenshot({ path: `${SHOT_DIR}/${name}-full.png`, fullPage: true })
  }
})
