'use client'

import { usePathname } from 'next/navigation'
import { Topbar } from '@/components/layout/topbar'
import { BottomNav } from '@/components/layout/bottom-nav'
import { NotificationFailureBanner } from '@/components/notifications/failure-banner'

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const noteEditorImmersive = pathname.startsWith('/notas/') && !pathname.startsWith('/notas/pastas')
  // Em /calendar (mobile) o menu inferior é ocultado, então removemos o padding reservado para ele.
  const isCalendar = pathname === '/calendar'

  if (noteEditorImmersive) {
    return (
      <div
        className="relative h-screen overflow-hidden text-navy-900"
        style={{
          background:
            'radial-gradient(900px 700px at 12% 20%, rgba(123,91,255,.22), transparent 62%), radial-gradient(800px 600px at 88% 14%, rgba(255,137,235,.16), transparent 64%), radial-gradient(900px 800px at 78% 78%, rgba(40,199,183,.24), transparent 62%), radial-gradient(1000px 900px at 18% 95%, rgba(47,107,255,.24), transparent 64%), linear-gradient(135deg, #D9E4FF 0%, #EEEAFE 38%, #FCE5F5 64%, #E1F7F4 100%)',
        }}
      >
        <main className="relative z-10 h-full w-full overflow-hidden">{children}</main>
      </div>
    )
  }

  return (
    <>
      <div className="doit-wallpaper pointer-events-none fixed inset-0 z-0 bg-[#f4f1ff]" />

      <div className="relative z-10 flex min-h-screen flex-col text-navy-900">
        <div className="mx-auto flex w-full min-w-0 max-w-[1440px] flex-1 flex-col p-0 lg:p-7">
          <div className="sticky top-0 z-50 lg:top-7 lg:mb-6">
            <Topbar />
          </div>
          <NotificationFailureBanner />
          <div className="flex flex-1 pt-5 lg:pt-0">
            <main className={`flex-1 lg:pb-0 ${isCalendar ? 'pb-0' : 'pb-[calc(7rem+env(safe-area-inset-bottom))]'}`}>
              {children}
            </main>
          </div>
        </div>
      </div>

      <BottomNav />
    </>
  )
}
