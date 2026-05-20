import { AppChrome } from '@/components/layout/app-chrome'
import { ItemDetail } from '@/components/items/item-detail'
import { BulkActionBar, ItemContextMenu } from '@/components/items/bulk-actions'
import { QuickCapture } from '@/components/items/quick-capture'
import { ShortcutHelpModal } from '@/components/layout/shortcut-help-modal'
import { UIProvider } from '@/store/ui-provider'
import { ToastProvider } from '@/components/ui/toast'
import { DialogProvider } from '@/components/ui/dialog'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <DialogProvider>
        <UIProvider>
          <AppChrome>{children}</AppChrome>

          <ItemDetail />
          <QuickCapture />
          <ItemContextMenu />
          <BulkActionBar />
          <ShortcutHelpModal />
        </UIProvider>
      </DialogProvider>
    </ToastProvider>
  )
}
