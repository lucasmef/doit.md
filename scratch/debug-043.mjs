import { createRequire } from 'node:module'
const req = createRequire(new URL('../apps/web/package.json', import.meta.url))
const { chromium } = req('playwright')
const BASE='http://127.0.0.1:3200'
const OUT='specs/artifacts/2026-05-31-validar-030-081'
const b = await chromium.launch({headless:true})
const ctx = await b.newContext({viewport:{width:1440,height:900},hasTouch:true})
const p = await ctx.newPage()
const u=`n43-${Date.now()}`
await p.goto(`${BASE}/sign-up`)
await p.fill('input[name="name"]','N43'); await p.fill('input[name="email"]',`${u}@example.invalid`); await p.fill('input[name="password"]','Password123!')
await p.click('button[type="submit"]'); await p.waitForURL('**/today**',{timeout:30000})
const post=(url,data)=>p.request.post(`${BASE}${url}`,{data}).then(r=>r.json())
const folder=(await post('/api/folders',{name:`N43 ${u}`})).folder
const noteTitle=`Nota destaque ${u}`
await post('/api/items',{title:noteTitle,complexity:'note',status:'todo',folderId:folder.id,contentMd:'corpo da nota'})
await p.goto(`${BASE}/notas?folder=${folder.id}`); await p.waitForLoadState('networkidle'); await p.waitForTimeout(700)
// força lista
const lista=p.getByRole('button',{name:'Lista'}).first()
if(await lista.isVisible().catch(()=>false)){ await lista.click(); await p.waitForTimeout(800) }
const row=p.locator('button').filter({hasText:'Nota destaque'}).first()
const cnt=await row.count()
console.log('note row count(list):',cnt)
let target = cnt>0 ? row : p.locator('button').filter({hasText:'corpo'}).first()
const bb=await target.boundingBox()
await p.mouse.click(bb.x+bb.width/2, bb.y+bb.height/2, {button:'right'})
await p.waitForTimeout(700)
const menu=await p.evaluate(()=>Array.from(document.querySelectorAll('button')).map(b=>(b.textContent||'').trim()))
console.log('has Destacar:', menu.some(t=>/Destacar/i.test(t)))
await p.screenshot({path:`${OUT}/ID043-destacar-menu-desktop.png`})
if(menu.some(t=>/Destacar/i.test(t))){
  await p.evaluate(()=>{const x=Array.from(document.querySelectorAll('button')).find(y=>/^Destacar$/i.test((y.textContent||'').trim()));x?.click()})
  await p.waitForTimeout(1000)
  const sect=await p.evaluate(()=>Array.from(document.querySelectorAll('*')).some(d=>d.children.length===0 && /Destacad/i.test(d.textContent||'')))
  console.log('Destacadas section:',sect)
  await p.screenshot({path:`${OUT}/ID043-destacadas-area-desktop.png`})
  // reabrir menu p/ confirmar virou "Remover destaque"
  const tt = cnt>0?row:p.locator('button').filter({hasText:'corpo'}).first()
  const b2=await tt.boundingBox(); await p.mouse.click(b2.x+b2.width/2,b2.y+b2.height/2,{button:'right'}); await p.waitForTimeout(600)
  const menu2=await p.evaluate(()=>Array.from(document.querySelectorAll('button')).map(b=>(b.textContent||'').trim()))
  console.log('now has Remover destaque:', menu2.some(t=>/Remover destaque/i.test(t)))
}
await b.close()
