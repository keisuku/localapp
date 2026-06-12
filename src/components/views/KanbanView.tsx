import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/core/store/useAppStore';
import { setStatus, updateRecord } from '@/core/db/mutations';
import type { AppRecord } from '@/core/types/record';
import type { FieldDef, ModuleDefinition } from '@/core/types/module';
import { getField, recordTitle } from '@/core/moduleUtils';
import { ScoreBar } from '@/components/common/ScoreBar';
import { cn } from '@/core/utils/cn';

interface KanbanColumn {
  value: string;
  label: string;
  color: string;
}

/** カンバンビュー。groupByKey が '$status' ならレコードのステータスで分類 */
export function KanbanView({
  module,
  fields,
  records,
}: {
  module: ModuleDefinition;
  fields: FieldDef[];
  records: AppRecord[];
}) {
  const openDrawer = useAppStore((s) => s.openDrawer);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const groupByKey = module.views.kanban.groupByKey;
  const byStatus = groupByKey === '$status';
  const groupField = byStatus ? undefined : getField(fields, groupByKey);

  const columns: KanbanColumn[] = byStatus
    ? module.statuses
    : (groupField?.options ?? []).map((o) => ({
        value: o.value,
        label: o.label,
        color: o.color ?? '#94a3b8',
      }));

  const order = module.views.kanban.columnOrder;
  const orderedColumns = order
    ? order
        .map((v) => columns.find((c) => c.value === v))
        .filter((c): c is KanbanColumn => !!c)
    : columns;

  const groupOf = (r: AppRecord) =>
    byStatus ? r.status : String(r.data[groupByKey] ?? '');

  const drop = async (recordId: string, value: string) => {
    if (byStatus) await setStatus([recordId], value);
    else await updateRecord(recordId, { data: { [groupByKey]: value } });
  };

  const unGrouped = records.filter((r) => !orderedColumns.some((c) => c.value === groupOf(r)));

  return (
    <div className="h-full overflow-x-auto p-4">
      <div className="flex h-full min-w-fit gap-3">
        {orderedColumns.map((col) => {
          const items = records.filter((r) => groupOf(r) === col.value);
          return (
            <div
              key={col.value}
              className={cn(
                'flex h-full w-66 shrink-0 flex-col rounded-xl border transition-colors',
                dragOver === col.value ? 'border-ring bg-accent/60' : 'bg-muted/40',
              )}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(col.value);
              }}
              onDragLeave={() => setDragOver((v) => (v === col.value ? null : v))}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(null);
                const id = e.dataTransfer.getData('text/record-id');
                if (id) void drop(id, col.value);
              }}
            >
              <div className="flex items-center gap-2 px-3 py-2.5">
                <span className="size-2 rounded-full" style={{ backgroundColor: col.color }} />
                <span className="text-sm font-semibold">{col.label}</span>
                <span className="text-muted-foreground tabular ml-auto text-xs">
                  {items.length}
                </span>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto px-2 pb-2">
                {items.map((r) => (
                  <KanbanCard key={r.id} record={r} module={module} onClick={() => openDrawer({ mode: 'view', recordId: r.id })} />
                ))}
                {items.length === 0 && (
                  <div className="text-muted-foreground/60 rounded-lg border border-dashed p-4 text-center text-xs">
                    ここにドロップ
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {unGrouped.length > 0 && (
          <div className="bg-muted/40 flex h-full w-66 shrink-0 flex-col rounded-xl border">
            <div className="px-3 py-2.5 text-sm font-semibold">未分類</div>
            <div className="flex-1 space-y-2 overflow-y-auto px-2 pb-2">
              {unGrouped.map((r) => (
                <KanbanCard key={r.id} record={r} module={module} onClick={() => openDrawer({ mode: 'view', recordId: r.id })} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function KanbanCard({
  record,
  module,
  onClick,
}: {
  record: AppRecord;
  module: ModuleDefinition;
  onClick: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/record-id', record.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onClick={onClick}
      className={cn(
        'bg-card hover:border-ring/60 cursor-grab space-y-1.5 rounded-lg border p-2.5 shadow-xs transition-all hover:shadow-sm active:cursor-grabbing',
        record.archived === 1 && 'opacity-55',
      )}
    >
      <div className="line-clamp-2 text-sm font-medium">{recordTitle(module, record.data)}</div>
      <div className="flex items-center justify-between gap-2">
        {module.scoring ? <ScoreBar score={record.score} className="max-w-[90px]" /> : <span />}
      </div>
      {record.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {record.tags.map((t) => (
            <Badge key={t} variant="secondary" className="px-1.5 py-0 text-[10px]">
              {t}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
