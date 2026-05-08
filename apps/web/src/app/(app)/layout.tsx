import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { BottomNav } from '@/components/layout/bottom-nav'
import { ItemDetail } from '@/components/items/item-detail'
import { QuickCapture } from '@/components/items/quick-capture'
import { CalendarSidebar } from '@/components/layout/calendar-sidebar'
import { NotificationFailureBanner } from '@/components/notifications/failure-banner'
import { UIProvider } from '@/store/ui-provider'
import { ToastProvider } from '@/components/ui/toast'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
    <UIProvider>
      <div className="flex h-screen overflow-hidden bg-surface-window">
        <div className="flex h-full w-full overflow-hidden bg-surface-window">
          {/* Sidebar — oculta em mobile */}
          <div className="hidden lg:block">
            <Sidebar />
          </div>

          <div className="flex flex-col flex-1 min-w-0">
            <Topbar />
            <NotificationFailureBanner />
            <div className="flex flex-1 overflow-hidden">
              {/* Conteúdo principal — padding extra no mobile para o bottom nav */}
              <main className="flex-1 overflow-y-auto pb-20 lg:pb-0 bg-surface-window px-3 lg:px-5">{children}</main>
            </div>
          </div>
        </div>
      </div>

      {/* Overlays e Modais */}
      <ItemDetail />
      <BottomNav />
      <QuickCapture />
      <CalendarSidebar />
    </UIProvider>
    </ToastProvider>
  )
}
