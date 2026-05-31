import path from 'node:path'
import { createRequire } from 'node:module'
const req = createRequire(new URL('../apps/web/package.json', import.meta.url))
const { chromium } = req('playwright')
const BASE='http://127.0.0.1:3200'
const OUT='specs/artifacts/2026-05-31-validar-030-081'
const b = await chromium.launch({headless:true})
const ctx = await b.newContext({viewport:{width:1440,height:900},hasTouch:true})
const p = await ctx.newPage()
const u=`fin-${Date.now()}`
await p.goto(`${BASE}/sign-up`)
await p.fill('input[name="name"]','Fin'); await p.fill('input[name="email"]',`${u}@example.invalid`); await p.fill('input[name="password"]','Password123!')
await p.click('button[type="submit"]'); await p.waitForURL('**/today**',{timeout:30000})
const post=(url,data)=>p.request.post(`${BASE}${url}`,{data}).then(r=>r.json())
const tk=new Date().toISOString().slice(0,10)
const folder=(await post('/api/folders',{name:`Fin ${u}`})).folder
await post('/api/items',{title:'Fin tarefa',complexity:'task',status:'todo',dueDate:tk,priority:1})
const noteTitle=`Fin nota ${u}`
await post('/api/items',{title:noteTitle,complexity:'note',status:'todo',folderId:folder.id,contentMd:'corpo'})

// 061/062 evidence
await p.goto(`${BASE}/today`); await p.waitForTimeout(2000)
await p.locator('.today-v3-layout .row.task, .today-v3-layout .row.personal').first().click()
await p.waitForTimeout(700)
await p.locator('.today-v3-layout .detail button',{hasText:'Editar'}).first().click()
await p.waitForTimeout(2000)
const header62 = await p.getByText('Editar tarefa',{exact:false}).first().isVisible().catch(()=>false)
await p.screenshot({path:`${OUT}/ID062-editar-tarefa-modal-desktop.png`})
const cb = p.locator('button[aria-label="Concluir tarefa"], button[aria-label="Reabrir tarefa"]').first()
const cbVis = await cb.isVisible().catch(()=>false)
let toggled=false
if(cbVis){ await cb.click(); await p.waitForTimeout(800); toggled=await p.getByText('concluída',{exact:false}).first().isVisible().catch(()=>false); await p.screenshot({path:`${OUT}/ID061-editar-tarefa-concluida-desktop.png`}) }
console.log('062 header:',header62,'| 061 checkbox:',cbVis,'toggled:',toggled)
await p.keyboard.press('Escape')

// 043: note in folder - inspect
await p.goto(`${BASE}/notas?folder=${folder.id}`); await p.waitForLoadState('networkidle'); await p.waitForTimeout(800)
const view = await p.evaluate(()=>{
  const btns=Array.from(document.querySelectorAll('button')).map(b=>(b.textContent||'').trim()).filter(Boolean)
  return {hasNote: btns.some(t=>/Fin nota/.test(t)), sample: btns.filter(t=>t.length<40).slice(0,20)}
})
console.log('FOLDER note visible:',view.hasNote,'| buttons:',JSON.stringify(view.sample))
// right-click the note row (button containing title)
const noteRow = p.locator('button').filter({hasText:'Fin nota'}).first()
const exists = await noteRow.count()
console.log('noteRow count:',exists)
if(exists>0){
  const bb=await noteRow.boundingBox()
  await p.mouse.click(bb.x+bb.width/2, bb.y+bb.height/2, {button:'right'})
  await p.waitForTimeout(700)
  const menuBtns=await p.evaluate(()=>Array.from(document.querySelectorAll('button')).map(b=>(b.textContent||'').trim()).filter(Boolean))
  const destacar=menuBtns.some(t=>/Destacar/i.test(t))
  console.log('043 menu has Destacar:',destacar)
  await p.screenshot({path:`${OUT}/ID043-destacar-menu-desktop.png`})
  if(destacar){
    await p.evaluate(()=>{const x=Array.from(document.querySelectorAll('button')).find(y=>/^Destacar/i.test((y.textContent||'').trim()));x?.click()})
    await p.waitForTimeout(900)
    const pinnedSection=await p.evaluate(()=>Array.from(document.querySelectorAll('*')).some(d=>d.children.length===0 && /Destacad/i.test(d.textContent||'')))
    console.log('043 Destacadas section after pin:',pinnedSection)
    await p.screenshot({path:`${OUT}/ID043-destacadas-area-desktop.png`})
  }
}
await b.close()
