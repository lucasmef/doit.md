import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { BottomNav } from '@/components/layout/bottom-nav'
import { ItemDetail } from '@/components/items/item-detail'
import { QuickCapture } from '@/components/items/quick-capture'
import { UIProvider } from '@/store/ui-provider'
import { ToastProvider } from '@/components/ui/toast'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
    <UIProvider>
      <div className="flex h-screen overflow-hidden bg-surface lg:p-4 xl:p-8">
        <div className="flex h-full w-full overflow-hidden bg-surface-window lg:rounded-[24px] lg:border lg:border-ui-border lg:shadow-sm">
          {/* Sidebar — oculta em mobile */}
          <div className="hidden lg:block">
            <Sidebar />
          </div>

          <div className="flex flex-col flex-1 min-w-0">
            <Topbar />
            <div className="flex flex-1 overflow-hidden">
              {/* Conteúdo principal — padding extra no mobile para o bottom nav */}
              <main className="flex-1 overflow-y-auto pb-20 lg:pb-0 bg-surface-window px-4 lg:px-8">{children}</main>
              <ItemDetail />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom nav — só mobile */}
      <BottomNav />
      <QuickCapture />
    </UIProvider>
    </ToastProvider>
  )
}
