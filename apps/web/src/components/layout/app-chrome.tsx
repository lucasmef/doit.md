'use client'

import { usePathname } from 'next/navigation'
import { Topbar } from '@/components/layout/topbar'
import { BottomNav } from '@/components/layout/bottom-nav'
import { CalendarSidebar } from '@/components/layout/calendar-sidebar'
import { NotificationFailureBanner } from '@/components/notifications/failure-banner'

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const todayMobileImmersive = pathname === '/today'
  const noteEditorImmersive = pathname.startsWith('/notas/') && !pathname.startsWith('/notas/pastas')

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
      <div className="doit-wallpaper relative flex h-screen overflow-hidden text-navy-900">
        <div className="relative z-10 flex h-full w-full overflow-hidden">
          <div className="mx-auto flex min-w-0 flex-1 flex-col p-0 lg:max-w-[1440px] lg:p-7">
            {todayMobileImmersive ? (
              <div className="hidden lg:block">
                <Topbar />
              </div>
            ) : (
              <Topbar />
            )}
            <NotificationFailureBanner />
            <div className="flex flex-1 overflow-hidden lg:rounded-[28px] lg:border lg:border-white/45 lg:bg-white/34 lg:shadow-[0_24px_60px_rgba(15,35,66,.12)] lg:backdrop-blur-xl">
              <main className="flex-1 overflow-y-auto pb-[calc(7rem+env(safe-area-inset-bottom))] lg:pb-0">
                {children}
              </main>
              <CalendarSidebar />
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </>
  )
}
