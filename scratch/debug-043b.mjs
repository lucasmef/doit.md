import { createRequire } from 'node:module'
const req = createRequire(new URL('../apps/web/package.json', import.meta.url))
const { chromium } = req('playwright')
const BASE='http://127.0.0.1:3200'
const OUT='specs/artifacts/2026-05-31-validar-030-081'
const b = await chromium.launch({headless:true})
const ctx = await b.newContext({viewport:{width:1440,height:900},hasTouch:true})
const p = await ctx.newPage()
const u=`n43b-${Date.now()}`
await p.goto(`${BASE}/sign-up`)
await p.fill('input[name="name"]','N43b'); await p.fill('input[name="email"]',`${u}@example.invalid`); await p.fill('input[name="password"]','Password123!')
await p.click('button[type="submit"]'); await p.waitForURL('**/today**',{timeout:30000})
const post=(url,data)=>p.request.post(`${BASE}${url}`,{data}).then(r=>r.json())
const folder=(await post('/api/folders',{name:`N43b ${u}`})).folder
await post('/api/items',{title:`Nota pin ${u}`,complexity:'note',status:'todo',folderId:folder.id,contentMd:'corpo nota pin'})
await p.goto(`${BASE}/notas?folder=${folder.id}`); await p.waitForLoadState('networkidle'); await p.waitForTimeout(800)
const target=p.locator('button').filter({hasText:'corpo nota pin'}).first()
const bb=await target.boundingBox()
await p.mouse.click(bb.x+bb.width/2, bb.y+bb.height/2, {button:'right'})
await p.waitForTimeout(700)
await p.screenshot({path:`${OUT}/ID043-destacar-menu-desktop.png`})
// clica o botão cujo texto CONTÉM Destacar (mas não "Remover destaque")
const clicked = await p.evaluate(()=>{
  const btns=Array.from(document.querySelectorAll('button'))
  const x=btns.find(y=>{const t=(y.textContent||'').trim(); return /Destacar/i.test(t) && !/Remover/i.test(t)})
  if(x){x.click(); return true} return false
})
console.log('clicked Destacar:',clicked)
await p.waitForTimeout(1200)
const prefs=await p.evaluate(()=>JSON.parse(localStorage.getItem('doit:preferences')||'{}'))
console.log('pinnedNoteIds:',JSON.stringify(prefs.pinnedNoteIds))
const sect=await p.evaluate(()=>Array.from(document.querySelectorAll('div')).some(d=>d.textContent?.trim()==='Destacadas'))
console.log('Destacadas section present:',sect)
await p.screenshot({path:`${OUT}/ID043-destacadas-area-desktop.png`})
await b.close()
