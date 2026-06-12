import { CheckCircle2, HardDrive, Moon, Rows3, Sun } from 'lucide-react';
import { useAppStore } from '@/core/store/useAppStore';
import { useLastSavedAt, useRecordCount } from '@/core/db/queries';
import { useVisibleRecords } from '@/hooks/useVisibleRecords';
import { usePrefsStore } from '@/core/store/prefs';
import { formatTime } from '@/core/utils/format';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/** 画面下部のステータスバー（右下に保存状態を常時表示） */
export function StatusBar() {
  const selection = useAppStore((s) => s.selection);
  const lastSavedAt = useLastSavedAt();
  const totalCount = useRecordCount();
  const { records, visible } = useVisibleRecords();
  const { theme, setTheme, density, setDensity } = usePrefsStore();

  return (
    <footer className="bg-card text-muted-foreground flex h-7 shrink-0 items-center gap-4 border-t px-3 text-xs">
      <span className="tabular">
        表示 {visible?.length ?? 0} 件
        {records !== undefined && visible !== undefined && records.length !== visible.length && (
          <span className="opacity-70">（全 {records.length} 件中）</span>
        )}
      </span>
      {selection.length > 0 && (
        <span className="text-primary tabular font-medium">{selection.length} 件選択中</span>
      )}

      <span className="ml-auto" />

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className="hover:text-foreground flex cursor-pointer items-center gap-1"
            onClick={() => setDensity(density === 'comfort' ? 'compact' : 'comfort')}
          >
            <Rows3 className="size-3.5" />
            {density === 'comfort' ? '標準' : 'コンパクト'}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">表示密度を切り替え</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className="hover:text-foreground flex cursor-pointer items-center gap-1"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}
            {theme === 'dark' ? 'ダーク' : 'ライト'}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">テーマを切り替え</TooltipContent>
      </Tooltip>

      <span className="flex items-center gap-1">
        <HardDrive className="size-3.5" />
        <span className="tabular">ローカル保存（{totalCount ?? 0}件）</span>
      </span>

      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="size-3.5" />
        {lastSavedAt ? (
          <span className="tabular">保存済み {formatTime(lastSavedAt)}</span>
        ) : (
          '自動保存オン'
        )}
      </span>
    </footer>
  );
}
