import { useConfirmStore } from '@/core/store/confirmStore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TriangleAlert } from 'lucide-react';

/** confirmDialog() から呼び出される共通の確認ダイアログ */
export function ConfirmDialogHost() {
  const { open, options, close } = useConfirmStore();
  return (
    <Dialog open={open} onOpenChange={(v) => !v && close(false)}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {options.destructive && <TriangleAlert className="text-destructive size-5" />}
            {options.title}
          </DialogTitle>
          {options.description && (
            <DialogDescription className="whitespace-pre-wrap pt-1">
              {options.description}
            </DialogDescription>
          )}
        </DialogHeader>
        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => close(false)}>
            {options.cancelLabel ?? 'キャンセル'}
          </Button>
          <Button
            variant={options.destructive ? 'destructive' : 'default'}
            onClick={() => close(true)}
            autoFocus
          >
            {options.confirmLabel ?? 'OK'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
