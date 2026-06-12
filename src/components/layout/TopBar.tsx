import {
  Archive,
  Columns3,
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  Filter,
  LayoutDashboard,
  LayoutGrid,
  Plus,
  Search,
  SquareKanban,
  Table2,
  Upload,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAppStore, type ViewName } from '@/core/store/useAppStore';
import { useVisibleRecords } from '@/hooks/useVisibleRecords';
import { exportRecords, type ExportFormat } from '@/core/export/exportData';
import { openFilePicker } from '@/core/importController';
import { loadSampleData } from '@/core/db/mutations';
import { useSettingValue } from '@/core/db/queries';
import { setSetting } from '@/core/db/db';
import { toast } from 'sonner';
import { cn } from '@/core/utils/cn';

const VIEW_TABS: { value: ViewName; label: string; icon: React.ReactNode }[] = [
  { value: 'dashboard', label: 'ダッシュボード', icon: <LayoutDashboard /> },
  { value: 'table', label: 'テーブル', icon: <Table2 /> },
  { value: 'card', label: 'カード', icon: <LayoutGrid /> },
  { value: 'kanban', label: 'カンバン', icon: <SquareKanban /> },
];

/** 上部アクションバー：検索・ビュー切替・よく使う操作を常時固定表示 */
export function TopBar() {
  const route = useAppStore((s) => s.route);
  const setView = useAppStore((s) => s.setView);
  const search = useAppStore((s) => s.search);
  const setSearch = useAppStore((s) => s.setSearch);
  const filterPanelOpen = useAppStore((s) => s.filterPanelOpen);
  const toggleFilterPanel = useAppStore((s) => s.toggleFilterPanel);
  const conditions = useAppStore((s) => s.conditions);
  const showArchived = useAppStore((s) => s.showArchived);
  const setShowArchived = useAppStore((s) => s.setShowArchived);
  const openDrawer = useAppStore((s) => s.openDrawer);

  const { moduleId, module, fields, visible } = useVisibleRecords();

  const columnVisibility = useSettingValue<Record<string, boolean>>(
    `columnVisibility:${moduleId ?? ''}`,
  );

  if (route.kind !== 'module' || !module) {
    return (
      <header className="bg-card flex h-13 items-center gap-3 border-b px-4">
        <h1 className="text-base font-semibold">設定・データ管理</h1>
      </header>
    );
  }

  const doExport = (format: ExportFormat) => {
    if (!visible || visible.length === 0) {
      toast.info('出力対象のデータがありません');
      return;
    }
    exportRecords(module, fields, visible, format);
    toast.success(`${visible.length}件を${format.toUpperCase()}に出力しました`);
  };

  const tableColumns = fields.filter((f) => f.type !== 'longtext' || true);

  return (
    <header className="bg-card flex h-13 shrink-0 items-center gap-2 border-b px-3">
      <h1 className="min-w-0 shrink-0 px-1 text-base font-semibold">{module.labels.moduleName}</h1>

      <Tabs value={route.view} onValueChange={(v) => setView(v as ViewName)} className="shrink-0">
        <TabsList>
          {VIEW_TABS.map((t) => (
            <Tooltip key={t.value}>
              <TooltipTrigger asChild>
                <span>
                  <TabsTrigger value={t.value} className="px-2.5">
                    {t.icon}
                  </TabsTrigger>
                </span>
              </TooltipTrigger>
              <TooltipContent>{t.label}</TooltipContent>
            </Tooltip>
          ))}
        </TabsList>
      </Tabs>

      <div className="relative mx-2 max-w-md flex-1">
        <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`${module.labels.recordName}を検索…（スペース区切りでAND検索）`}
          className="h-8.5 pl-8"
          data-search-input
        />
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        <Button
          variant={filterPanelOpen || conditions.length > 0 ? 'secondary' : 'ghost'}
          size="sm"
          onClick={toggleFilterPanel}
          className={cn(conditions.length > 0 && 'text-primary')}
        >
          <Filter className="size-4" />
          フィルター
          {conditions.length > 0 && (
            <span className="bg-primary text-primary-foreground tabular rounded-full px-1.5 text-[10px]">
              {conditions.length}
            </span>
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <Columns3 className="size-4" />
              表示
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>表示する列</DropdownMenuLabel>
            {tableColumns.map((f) => {
              const visible = columnVisibility?.[f.key] ?? f.showInTable !== false;
              return (
                <DropdownMenuCheckboxItem
                  key={f.key}
                  checked={visible}
                  onCheckedChange={(checked) => {
                    void setSetting(`columnVisibility:${moduleId}`, {
                      ...(columnVisibility ?? {}),
                      [f.key]: checked,
                    });
                  }}
                  onSelect={(e) => e.preventDefault()}
                >
                  {f.label}
                </DropdownMenuCheckboxItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={showArchived}
              onCheckedChange={setShowArchived}
              onSelect={(e) => e.preventDefault()}
            >
              <Archive className="size-4" />
              アーカイブも表示
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="outline" size="sm" onClick={openFilePicker}>
          <Upload className="size-4" />
          インポート
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Download className="size-4" />
              エクスポート
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              表示中の{visible?.length ?? 0}件を出力
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => doExport('xlsx')}>
              <FileSpreadsheet className="size-4" />
              Excel（.xlsx）
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => doExport('csv')}>
              <FileText className="size-4" />
              CSV（UTF-8 BOM付き）
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => doExport('json')}>
              <FileJson className="size-4" />
              JSON
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                void loadSampleData([module.id]);
              }}
            >
              <Sparkles className="size-4" />
              サンプルデータを読み込む
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button size="sm" onClick={() => openDrawer({ mode: 'create', recordId: null })}>
          <Plus className="size-4" />
          新規追加
        </Button>
      </div>
    </header>
  );
}
