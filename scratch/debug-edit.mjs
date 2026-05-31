import { createRequire } from 'node:module'
const req = createRequire(new URL('../apps/web/package.json', import.meta.url))
const { chromium } = req('playwright')
const BASE='http://127.0.0.1:3200'
const b = await chromium.launch({headless:true})
const ctx = await b.newContext({viewport:{width:1440,height:900},hasTouch:true})
const p = await ctx.newPage()
const u=`dbg-${Date.now()}`
await p.goto(`${BASE}/sign-up`)
await p.fill('input[name="name"]','Dbg'); await p.fill('input[name="email"]',`${u}@example.invalid`); await p.fill('input[name="password"]','Password123!')
await p.click('button[type="submit"]'); await p.waitForURL('**/today**',{timeout:30000})
const tk=new Date().toISOString().slice(0,10)
await p.request.post(`${BASE}/api/items`,{data:{title:'Dbg tarefa',complexity:'task',status:'todo',dueDate:tk,priority:1}})
await p.goto(`${BASE}/today`); await p.waitForTimeout(2000)
await p.locator('.today-v3-layout .row.task, .today-v3-layout .row.personal').first().click()
await p.waitForTimeout(700)
const detailHtml = await p.evaluate(()=>{const d=document.querySelector('.today-v3-layout .detail');return d?d.innerHTML.slice(0,400):'NO DETAIL'})
console.log('DETAIL BTNS:', await p.locator('.today-v3-layout .detail button').allInnerTexts())
// click Editar
const eb = p.locator('.today-v3-layout .detail button', {hasText:'Editar'}).first()
console.log('editar visible:', await eb.isVisible().catch(()=>false))
await eb.click().catch(e=>console.log('click err',e.message))
await p.waitForTimeout(2000)
const dlg = await p.evaluate(()=>{
  const d=document.querySelector('div[role="dialog"]')
  const texts = Array.from(document.querySelectorAll('div[role="dialog"] b, div[role="dialog"] h2, div[role="dialog"] span')).map(e=>e.textContent.trim()).filter(Boolean).slice(0,15)
  const aria = Array.from(document.querySelectorAll('button[aria-label]')).map(x=>x.getAttribute('aria-label')).filter(a=>/tarefa|Fechar/.test(a))
  return {hasDialog:!!d, texts, aria}
})
console.log('DIALOG:', JSON.stringify(dlg,null,1))
await b.close()
