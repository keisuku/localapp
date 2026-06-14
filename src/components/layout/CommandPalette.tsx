import { useMemo, useState } from 'react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import {
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  GitCompareArrows,
  Keyboard,
  Moon,
  Plus,
  RotateCcw,
  Rows3,
  Settings,
  Sparkles,
  Upload,
} from 'lucide-react';
import { moduleRegistry, getModule } from '@/modules';
import { useAppStore } from '@/core/store/useAppStore';
import { useAllRecords } from '@/core/db/queries';
import { searchMatch } from '@/core/search/filterRecords';
import { recordTitle } from '@/core/moduleUtils';
import { ModuleIcon } from '@/components/common/Icon';
import { StatusChip } from '@/components/common/StatusChip';
import { undoManager } from '@/core/undo/undoManager';
import { openFilePicker } from '@/core/importController';
import { loadSampleData } from '@/core/db/mutations';
import { exportBackup } from '@/core/export/backup';
import { usePrefsStore } from '@/core/store/prefs';
import { useVisibleRecords } from '@/hooks/useVisibleRecords';
import { exportRecords, type ExportFormat } from '@/core/export/exportData';
import { toast } from 'sonner';

/** Ctrl+K：主要操作と全モジュール横断のレコード検索 */
export function CommandPalette() {
  const open = useAppStore((s) => s.paletteOpen);
  const setOpen = useAppStore((s) => s.setPaletteOpen);
  const navigate = useAppStore((s) => s.navigate);
  const openDrawer = useAppStore((s) => s.openDrawer);
  const setShortcutsOpen = useAppStore((s) => s.setShortcutsOpen);
  const route = useAppStore((s) => s.route);
  const { module, fields, visible } = useVisibleRecords();
  const { theme, setTheme, density, setDensity } = usePrefsStore();

  const [query, setQuery] = useState('');
  const allRecords = useAllRecords();

  const recordHits = useMemo(() => {
    if (query.trim().length < 2 || !allRecords) return [];
    return allRecords.filter((r) => searchMatch(r, query)).slice(0, 8);
  }, [query, allRecords]);

  const run = (fn: () => void) => {
    setOpen(false);
    setQuery('');
    fn();
  };

  const doExport = (format: ExportFormat) =>
    run(() => {
      if (!module || !visible?.length) {
        toast.info('出力対象のデータがありません');
        return;
      }
      exportRecords(module, fields, visible, format);
      toast.success(`${visible.length}件を${format.toUpperCase()}に出力しました`);
    });

  return (
    <CommandDialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setQuery(''); }}>
      <CommandInput
        placeholder="操作を検索、またはレコードを横断検索…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>見つかりませんでした</CommandEmpty>

        {recordHits.length > 0 && (
          <>
            <CommandGroup heading="レコード">
              {recordHits.map((r) => {
                const m = getModule(r.moduleId);
                if (!m) return null;
                return (
                  <CommandItem
                    key={r.id}
                    value={`record-${r.id}`}
                    onSelect={() =>
                      run(() => {
                        navigate({ kind: 'module', moduleId: r.moduleId, view: 'table' });
                        openDrawer({ mode: 'view', recordId: r.id });
                      })
                    }
                  >
                    <ModuleIcon name={m.labels.icon} className="size-4" />
                    <span className="flex-1 truncate">{recordTitle(m, r.data)}</span>
                    <StatusChip module={m} status={r.status} />
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="操作">
          {route.kind === 'module' && module && (
            <CommandItem onSelect={() => run(() => openDrawer({ mode: 'create', recordId: null }))}>
              <Plus />
              {module.labels.recordName}を新規追加
            </CommandItem>
          )}
          <CommandItem onSelect={() => run(openFilePicker)}>
            <Upload />
            ファイルを取り込む（Excel / CSV / JSON）
          </CommandItem>
          <CommandItem onSelect={() => doExport('xlsx')}>
            <FileSpreadsheet />
            Excelに出力
          </CommandItem>
          <CommandItem onSelect={() => doExport('csv')}>
            <FileText />
            CSVに出力
          </CommandItem>
          <CommandItem onSelect={() => doExport('json')}>
            <FileJson />
            JSONに出力
          </CommandItem>
          <CommandItem onSelect={() => run(() => void exportBackup())}>
            <Download />
            全データをバックアップ
          </CommandItem>
          <CommandItem
            onSelect={() => run(() => void undoManager.undoLast())}
            disabled={!undoManager.canUndo()}
          >
            <RotateCcw />
            元に戻す{undoManager.peekLabel() ? `：${undoManager.peekLabel()}` : ''}
            <CommandShortcut>Ctrl+Z</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => run(() => void loadSampleData())}>
            <Sparkles />
            サンプルデータを読み込む（全モジュール）
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="移動">
          {moduleRegistry.map((m) => (
            <CommandItem
              key={m.id}
              onSelect={() => run(() => navigate({ kind: 'module', moduleId: m.id, view: 'dashboard' }))}
            >
              <ModuleIcon name={m.labels.icon} className="size-4" />
              {m.labels.moduleName}
            </CommandItem>
          ))}
          <CommandItem onSelect={() => run(() => navigate({ kind: 'compare' }))}>
            <GitCompareArrows />
            予実・差分比較
          </CommandItem>
          <CommandItem onSelect={() => run(() => navigate({ kind: 'settings' }))}>
            <Settings />
            設定・データ管理
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="表示">
          <CommandItem onSelect={() => run(() => setTheme(theme === 'dark' ? 'light' : 'dark'))}>
            <Moon />
            {theme === 'dark' ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
          </CommandItem>
          <CommandItem
            onSelect={() => run(() => setDensity(density === 'comfort' ? 'compact' : 'comfort'))}
          >
            <Rows3 />
            表示密度を{density === 'comfort' ? 'コンパクト' : '標準'}にする
          </CommandItem>
          <CommandItem onSelect={() => run(() => setShortcutsOpen(true))}>
            <Keyboard />
            キーボードショートカット一覧
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
