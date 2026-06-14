import { Command as CommandIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/core/store/useAppStore';
import { cn } from '@/core/utils/cn';

const isMac =
  typeof navigator !== 'undefined' && /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent);

/**
 * どのページからでも「次に何ができる？」へ辿り着ける常設ボタン。
 * クリックでコマンドパレット（Ctrl/⌘+K）を開く。
 */
export function CommandPaletteButton({ className }: { className?: string }) {
  const setPaletteOpen = useAppStore((s) => s.setPaletteOpen);
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setPaletteOpen(true)}
      className={cn('text-muted-foreground gap-2', className)}
      title="コマンドパレットを開く"
    >
      <CommandIcon className="size-4" />
      <span className="hidden sm:inline">コマンド</span>
      <kbd className="bg-muted text-muted-foreground pointer-events-none hidden rounded px-1.5 py-0.5 text-[10px] font-medium md:inline">
        {isMac ? '⌘K' : 'Ctrl K'}
      </kbd>
    </Button>
  );
}
