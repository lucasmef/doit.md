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
      <div className="relative flex h-screen overflow-hidden bg-[#dbe7ff] text-navy-900 before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(900px_700px_at_8%_15%,rgba(123,91,255,.24),transparent_62%),radial-gradient(780px_560px_at_92%_10%,rgba(255,111,174,.18),transparent_60%),radial-gradient(850px_720px_at_78%_82%,rgba(40,199,183,.22),transparent_62%),linear-gradient(135deg,#f3f7ff_0%,#e8e2ff_42%,#f9d8ef_66%,#ddf5f1_100%)] after:pointer-events-none after:absolute after:inset-0 after:bg-[linear-gradient(rgba(255,255,255,.20)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.18)_1px,transparent_1px)] after:bg-[size:38px_38px] after:opacity-35">
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
