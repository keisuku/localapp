import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAppStore } from '@/core/store/useAppStore';

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ['Ctrl', 'K'], label: 'コマンドパレットを開く' },
  { keys: ['Ctrl', 'Z'], label: '直前の操作を元に戻す' },
  { keys: ['Ctrl', 'V'], label: 'Excelからコピーしたセルを取り込む' },
  { keys: ['↑', '↓'], label: 'テーブルの行を移動（j / k も可）' },
  { keys: ['Enter'], label: '選択中の行の詳細を開く' },
  { keys: ['Space'], label: '行の選択を切り替える' },
  { keys: ['Delete'], label: '選択中の行を削除（確認あり）' },
  { keys: ['Esc'], label: '選択解除・ドロワーを閉じる' },
  { keys: ['?'], label: 'このショートカット一覧を表示' },
];

export function ShortcutsDialog() {
  const open = useAppStore((s) => s.shortcutsOpen);
  const setOpen = useAppStore((s) => s.setShortcutsOpen);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>キーボードショートカット</DialogTitle>
        </DialogHeader>
        <div className="divide-y">
          {SHORTCUTS.map((s) => (
            <div key={s.label} className="flex items-center justify-between py-2 text-sm">
              <span>{s.label}</span>
              <span className="flex gap-1">
                {s.keys.map((k) => (
                  <kbd
                    key={k}
                    className="bg-muted text-muted-foreground rounded border px-1.5 py-0.5 font-mono text-xs"
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
