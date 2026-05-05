import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { ItemDetail } from '@/components/items/item-detail'
import { QuickCapture } from '@/components/items/quick-capture'
import { UIProvider } from '@/store/ui-provider'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <UIProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <Topbar />
          <div className="flex flex-1 overflow-hidden">
            <main className="flex-1 overflow-y-auto">{children}</main>
            <ItemDetail />
          </div>
        </div>
      </div>
      <QuickCapture />
    </UIProvider>
  )
}
