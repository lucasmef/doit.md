'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { BottomNav } from '@/components/layout/bottom-nav'
import { CalendarSidebar } from '@/components/layout/calendar-sidebar'
import { NotificationFailureBanner } from '@/components/notifications/failure-banner'

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const calendarFullscreen = pathname === '/calendar'

  return (
    <>
      <div className="flex h-screen overflow-hidden bg-surface-window text-navy-900">
        <div className="flex h-full w-full overflow-hidden bg-surface-window">
          <div className="hidden lg:block">
            <Sidebar />
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            {calendarFullscreen ? null : <Topbar />}
            {calendarFullscreen ? null : <NotificationFailureBanner />}
            <div className="flex flex-1 overflow-hidden">
              <main
                className={`flex-1 bg-surface-window ${
                  calendarFullscreen
                    ? 'overflow-hidden max-lg:h-[calc(100dvh_-_76px_-_env(safe-area-inset-bottom))] max-lg:w-full max-lg:flex-none lg:pb-0'
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
