import fs from 'fs'

const file = 'apps/web/src/components/calendar/calendar-event-capture.tsx'
let content = fs.readFileSync(file, 'utf8')

if (!content.includes('const [isDesktop, setIsDesktop] = useState(false)')) {
  content = content.replace(
    'const [expanded, setExpanded] = useState(false)',
    `const [expanded, setExpanded] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(min-width: 1024px)')
    const update = () => setIsDesktop(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  const isExpanded = expanded || isDesktop`
  )
}

// Replace the background aurora rendering
const oldAurora = `<div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(900px_700px_at_12%_20%,rgba(123,91,255,.55),transparent_60%),radial-gradient(800px_600px_at_88%_14%,rgba(255,111,174,.34),transparent_62%),radial-gradient(900px_800px_at_78%_78%,rgba(40,199,183,.44),transparent_60%),radial-gradient(1000px_900px_at_18%_95%,rgba(47,107,255,.46),transparent_62%),linear-gradient(135deg,#B7C9FF_0%,#DDD6FE_35%,#FBC9F0_60%,#CFF3EE_100%)] opacity-95"
      />`
const newAurora = `{isExpanded ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(900px_700px_at_12%_20%,rgba(123,91,255,.55),transparent_60%),radial-gradient(800px_600px_at_88%_14%,rgba(255,111,174,.34),transparent_62%),radial-gradient(900px_800px_at_78%_78%,rgba(40,199,183,.44),transparent_60%),radial-gradient(1000px_900px_at_18%_95%,rgba(47,107,255,.46),transparent_62%),linear-gradient(135deg,#B7C9FF_0%,#DDD6FE_35%,#FBC9F0_60%,#CFF3EE_100%)] opacity-95"
        />
      ) : null}`
content = content.replace(oldAurora, newAurora)

// Replace the container className logic
const oldClass1 = `        className={
          expanded
            ? 'relative w-full max-h-[calc(100dvh-1rem)] max-w-[560px] overflow-hidden rounded-t-[30px] border border-white/80 bg-white/[0.90] shadow-[0_34px_90px_-42px_rgba(15,35,66,.58),0_10px_26px_rgba(15,35,66,.10),0_1px_0_rgba(255,255,255,.76)_inset] backdrop-blur-[24px] sm:max-h-none sm:overflow-visible sm:rounded-[28px]'
            : 'relative w-full max-w-[500px] overflow-hidden bg-white/92 backdrop-blur-[24px] p-3 pb-[calc(1rem+env(safe-area-inset-bottom))] rounded-t-[30px] border border-white/76 shadow-[0_-28px_70px_-36px_rgba(15,35,66,0.64)] sm:rounded-[28px] sm:pb-3 sm:shadow-[0_34px_90px_-42px_rgba(15,35,66,0.58),0_10px_26px_rgba(15,35,66,0.1),0_1px_0_rgba(255,255,255,0.76)_inset]'
        }`
const newClass1 = `        className={
          isExpanded
            ? 'relative w-full max-h-[calc(100dvh-1rem)] max-w-[560px] overflow-hidden rounded-t-[30px] border border-white/80 bg-white/[0.90] shadow-[0_34px_90px_-42px_rgba(15,35,66,.58),0_10px_26px_rgba(15,35,66,.10),0_1px_0_rgba(255,255,255,.76)_inset] backdrop-blur-[24px] sm:max-h-none sm:overflow-visible sm:rounded-[28px]'
            : 'relative w-full max-w-[500px] overflow-hidden bg-white p-3 pb-[calc(1rem+env(safe-area-inset-bottom))] rounded-t-[30px] border border-white/76 shadow-[0_-28px_70px_-36px_rgba(15,35,66,0.64)] sm:rounded-[28px] sm:pb-3 sm:shadow-[0_34px_90px_-42px_rgba(15,35,66,0.58),0_10px_26px_rgba(15,35,66,0.1),0_1px_0_rgba(255,255,255,0.76)_inset]'
        }`
content = content.replace(oldClass1, newClass1)

// Update expanded -> isExpanded in render checks
content = content.replace(/className=\{\`flex flex-col sm:max-h-none \$\{expanded \? /g, "className={`flex flex-col sm:max-h-none ${isExpanded ? ")
content = content.replace(/\{!expanded \? \(/g, "{!isExpanded ? (")
content = content.replace(/className=\{\`\$\{expanded \? 'block' : 'hidden sm:block'\} /g, "className={`${isExpanded ? 'block' : 'hidden sm:block'} ")

fs.writeFileSync(file, content, 'utf8')
console.log('Modifications for event capture completed.')
