import { Plus, SearchX, Sparkles, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/core/store/useAppStore';
import { useVisibleRecords } from '@/hooks/useVisibleRecords';
import { loadSampleData } from '@/core/db/mutations';
import { openFilePicker } from '@/core/importController';
import { ModuleIcon } from '@/components/common/Icon';
import { EmptyState } from '@/components/common/EmptyState';
import { DashboardView } from './DashboardView';
import { TableView } from './TableView';
import { CardView } from './CardView';
import { KanbanView } from './KanbanView';
import { FilterPanel } from '@/components/filters/FilterPanel';
import { BulkActionBar } from '@/components/record/BulkActionBar';

/** ツールバー下のメイン領域：ビュー切替・空状態・フィルターパネル・一括操作バー */
export function ViewContainer() {
  const route = useAppStore((s) => s.route);
  const filterPanelOpen = useAppStore((s) => s.filterPanelOpen);
  const openDrawer = useAppStore((s) => s.openDrawer);
  const setConditions = useAppStore((s) => s.setConditions);
  const setSearch = useAppStore((s) => s.setSearch);
  const search = useAppStore((s) => s.search);
  const conditions = useAppStore((s) => s.conditions);

  const { module, fields, records, visible } = useVisibleRecords();

  if (route.kind !== 'module' || !module) return null;

  const renderBody = () => {
    if (records === undefined || visible === undefined) {
      return (
        <div className="space-y-2 p-4">
          <Skeleton className="h-9 w-full" />
          {Array.from({ length: 10 }, (_, i) => (
            <Skeleton key={i} className="h-9 w-full" style={{ opacity: 1 - i * 0.08 }} />
          ))}
        </div>
      );
    }

    if (records.length === 0) {
      return (
        <EmptyState
          icon={<ModuleIcon name={module.labels.icon} />}
          title={`${module.labels.moduleName}を始めましょう`}
          description={module.labels.emptyStateText}
          actions={
            <>
              <Button size="lg" onClick={() => void loadSampleData([module.id])}>
                <Sparkles className="size-4" />
                サンプルデータで試す
              </Button>
              <Button variant="outline" size="lg" onClick={openFilePicker}>
                <Upload className="size-4" />
                ファイルを取り込む
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => openDrawer({ mode: 'create', recordId: null })}
              >
                <Plus className="size-4" />
                手入力で追加
              </Button>
            </>
          }
          footer="Excel / CSV / JSON は画面のどこにでもドラッグ＆ドロップで取り込めます"
        />
      );
    }

    if (visible.length === 0) {
      return (
        <EmptyState
          icon={<SearchX />}
          title="条件に一致するデータがありません"
          description="検索キーワードやフィルター条件を見直してください。"
          actions={
            (search || conditions.length > 0) && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearch('');
                  setConditions([]);
                }}
              >
                検索・フィルターをクリア
              </Button>
            )
          }
        />
      );
    }

    switch (route.view) {
      case 'dashboard':
        return <DashboardView module={module} fields={fields} records={visible} />;
      case 'table':
        return <TableView key={module.id} module={module} fields={fields} records={visible} />;
      case 'card':
        return <CardView module={module} fields={fields} records={visible} />;
      case 'kanban':
        return <KanbanView module={module} fields={fields} records={visible} />;
    }
  };

  return (
    <div className="relative flex min-h-0 flex-1">
      <main className="min-w-0 flex-1 overflow-hidden">{renderBody()}</main>
      {filterPanelOpen && <FilterPanel module={module} fields={fields} />}
      <BulkActionBar />
    </div>
  );
}
