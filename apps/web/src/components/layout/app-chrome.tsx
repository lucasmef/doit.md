'use client'

import { usePathname } from 'next/navigation'
import { Topbar } from '@/components/layout/topbar'
import { BottomNav } from '@/components/layout/bottom-nav'
import { CalendarSidebar } from '@/components/layout/calendar-sidebar'
import { NotificationFailureBanner } from '@/components/notifications/failure-banner'

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const calendarFullscreen = pathname === '/calendar'
  const todayMobileImmersive = pathname === '/today'

  return (
    <>
      <div className="doit-wallpaper relative flex h-screen overflow-hidden text-navy-900">
        <div className="relative z-10 flex h-full w-full overflow-hidden">
          <div className="mx-auto flex min-w-0 flex-1 flex-col p-0 lg:max-w-[1440px] lg:p-7">
            {calendarFullscreen ? (
              <div className="lg:hidden">
                <Topbar />
              </div>
            ) : todayMobileImmersive ? (
              <div className="hidden lg:block">
                <Topbar />
              </div>
            ) : (
              <Topbar />
            )}
            {calendarFullscreen ? null : <NotificationFailureBanner />}
            <div className="flex flex-1 overflow-hidden lg:rounded-[28px] lg:border lg:border-white/45 lg:bg-white/34 lg:shadow-[0_24px_60px_rgba(15,35,66,.12)] lg:backdrop-blur-xl">
              <main
                className={`flex-1 ${
                  calendarFullscreen
                    ? 'overflow-hidden max-lg:h-[calc(100dvh_-_56px_-_76px_-_env(safe-area-inset-bottom))] max-lg:w-full max-lg:flex-none lg:pb-0'
                    : 'overflow-y-auto pb-[calc(7rem+env(safe-area-inset-bottom))] lg:pb-0'
                }`}
              >
                {children}
              </main>
              {calendarFullscreen ? null : <CalendarSidebar />}
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </>
  )
}
