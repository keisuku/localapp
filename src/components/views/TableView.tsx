import { useEffect, useMemo, useRef, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnSizingState,
  type Row,
  type SortingState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/core/store/useAppStore';
import { useSettingValue } from '@/core/db/queries';
import { setSetting } from '@/core/db/db';
import { deleteRecords, setStatus, updateRecord } from '@/core/db/mutations';
import { confirmDialog } from '@/core/store/confirmStore';
import { toNumber, toDateString } from '@/core/utils/format';
import type { AppRecord } from '@/core/types/record';
import type { FieldDef, ModuleDefinition } from '@/core/types/module';
import { FieldValue } from '@/components/common/FieldValue';
import { ScoreBar } from '@/components/common/ScoreBar';
import { StatusChip } from '@/components/common/StatusChip';
import { FieldInput } from '@/components/record/RecordForm';
import { RatingStars } from '@/components/common/RatingStars';
import { cn } from '@/core/utils/cn';

const INLINE_EDITABLE: FieldDef['type'][] = [
  'text',
  'number',
  'currency',
  'date',
  'select',
  'url',
  'rating',
];

/** ソート用に値を比較可能な形へ正規化する */
function sortValue(field: FieldDef, v: unknown): number | string | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  switch (field.type) {
    case 'number':
    case 'currency':
    case 'rating':
      return toNumber(v) ?? undefined;
    case 'date':
      return toDateString(v) ?? undefined;
    default:
      return String(v).toLowerCase();
  }
}

export function TableView({
  module,
  fields,
  records,
}: {
  module: ModuleDefinition;
  fields: FieldDef[];
  records: AppRecord[];
}) {
  const selection = useAppStore((s) => s.selection);
  const setSelection = useAppStore((s) => s.setSelection);
  const toggleSelect = useAppStore((s) => s.toggleSelect);
  const openDrawer = useAppStore((s) => s.openDrawer);
  const focusedRecordId = useAppStore((s) => s.focusedRecordId);
  const setFocusedRecordId = useAppStore((s) => s.setFocusedRecordId);

  const columnVisibility = useSettingValue<Record<string, boolean>>(
    `columnVisibility:${module.id}`,
  );
  const savedSizing = useSettingValue<ColumnSizingState>(`columnSizing:${module.id}`);

  const [sorting, setSorting] = useState<SortingState>(() => {
    const ds = module.views.table.defaultSort;
    return ds ? [{ id: ds.key, desc: ds.desc ?? false }] : [];
  });
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  const [editingCell, setEditingCell] = useState<{ rowId: string; key: string } | null>(null);

  useEffect(() => {
    if (savedSizing) setColumnSizing(savedSizing);
  }, [savedSizing === undefined]); // eslint-disable-line react-hooks/exhaustive-deps

  const orderedFields = useMemo(() => {
    const order = module.views.table.columnOrder;
    const inOrder = order
      .map((k) => fields.find((f) => f.key === k))
      .filter((f): f is FieldDef => !!f);
    const rest = fields.filter((f) => !order.includes(f.key));
    return [...inOrder, ...rest].filter(
      (f) => columnVisibility?.[f.key] ?? f.showInTable !== false,
    );
  }, [module, fields, columnVisibility]);

  const selectionSet = useMemo(() => new Set(selection), [selection]);

  const columns = useMemo<ColumnDef<AppRecord>[]>(() => {
    const cols: ColumnDef<AppRecord>[] = [
      {
        id: '$select',
        size: 36,
        enableSorting: false,
        enableResizing: false,
        header: () => (
          <Checkbox
            checked={
              records.length > 0 && selection.length >= records.length
                ? true
                : selection.length > 0
                  ? 'indeterminate'
                  : false
            }
            onCheckedChange={(checked) =>
              setSelection(checked ? records.map((r) => r.id) : [])
            }
            aria-label="すべて選択"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={selectionSet.has(row.original.id)}
            onCheckedChange={() => toggleSelect(row.original.id)}
            onClick={(e) => e.stopPropagation()}
            aria-label="行を選択"
          />
        ),
      },
    ];

    if (module.scoring) {
      cols.push({
        id: '$score',
        size: 130,
        header: 'スコア',
        accessorFn: (r) => r.score ?? undefined,
        sortUndefined: 'last',
        cell: ({ row }) => <ScoreBar score={row.original.score} />,
      });
    }

    cols.push({
      id: '$status',
      size: 120,
      header: 'ステータス',
      accessorFn: (r) => {
        const i = module.statuses.findIndex((s) => s.value === r.status);
        return i === -1 ? module.statuses.length : i;
      },
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="cursor-pointer" onClick={(e) => e.stopPropagation()}>
              <StatusChip module={module} status={row.original.status} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {module.statuses.map((s) => (
              <DropdownMenuItem
                key={s.value}
                onClick={() => void setStatus([row.original.id], s.value)}
              >
                <span className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
                {s.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    });

    for (const f of orderedFields) {
      cols.push({
        id: f.key,
        size: f.width ?? 150,
        header: f.label,
        accessorFn: (r) => sortValue(f, r.data[f.key]),
        sortUndefined: 'last',
        cell: ({ row }) => {
          const isEditing = editingCell?.rowId === row.original.id && editingCell.key === f.key;
          if (isEditing) {
            return (
              <InlineCellEditor
                field={f}
                initial={row.original.data[f.key]}
                onCommit={(v) => {
                  setEditingCell(null);
                  void updateRecord(row.original.id, { data: { [f.key]: v ?? '' } });
                }}
                onCancel={() => setEditingCell(null)}
              />
            );
          }
          if (f.type === 'rating') {
            // 評価はその場でクリック編集できる
            return (
              <FieldValueEditableRating record={row.original} field={f} />
            );
          }
          return (
            <div
              className={cn(f.align === 'right' && 'text-right', f.align === 'center' && 'text-center')}
              onDoubleClick={(e) => {
                if (!INLINE_EDITABLE.includes(f.type)) return;
                e.stopPropagation();
                setEditingCell({ rowId: row.original.id, key: f.key });
              }}
            >
              <FieldValue field={f} value={row.original.data[f.key]} />
            </div>
          );
        },
      });
    }

    cols.push({
      id: '$tags',
      size: 150,
      header: 'タグ',
      accessorFn: (r) => r.tags.join(',').toLowerCase() || undefined,
      sortUndefined: 'last',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.tags.map((t) => (
            <Badge key={t} variant="secondary" className="px-1.5 py-0 text-[10px]">
              {t}
            </Badge>
          ))}
        </div>
      ),
    });

    return cols;
  }, [module, orderedFields, records, selection, selectionSet, editingCell, setSelection, toggleSelect]);

  const table = useReactTable({
    data: records,
    columns,
    state: { sorting, columnSizing },
    onSortingChange: setSorting,
    onColumnSizingChange: (updater) => {
      setColumnSizing((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        void setSetting(`columnSizing:${module.id}`, next);
        return next;
      });
    },
    columnResizeMode: 'onChange',
    enableColumnResizing: true,
    enableMultiSort: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (r) => r.id,
  });

  const rows = table.getRowModel().rows;
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 41,
    overscan: 12,
  });

  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleRowClick = (row: Row<AppRecord>) => {
    setFocusedRecordId(row.original.id);
    if (clickTimer.current) clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(() => {
      openDrawer({ mode: 'view', recordId: row.original.id });
    }, 180);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (editingCell) return;
    const idx = rows.findIndex((r) => r.original.id === focusedRecordId);
    const move = (next: number) => {
      const clamped = Math.max(0, Math.min(rows.length - 1, next));
      const row = rows[clamped];
      if (row) {
        setFocusedRecordId(row.original.id);
        virtualizer.scrollToIndex(clamped, { align: 'auto' });
      }
    };
    switch (e.key) {
      case 'ArrowDown':
      case 'j':
        e.preventDefault();
        move(idx < 0 ? 0 : idx + 1);
        break;
      case 'ArrowUp':
      case 'k':
        e.preventDefault();
        move(idx < 0 ? 0 : idx - 1);
        break;
      case 'Enter':
        if (focusedRecordId) {
          e.preventDefault();
          openDrawer({ mode: 'view', recordId: focusedRecordId });
        }
        break;
      case ' ':
        if (focusedRecordId) {
          e.preventDefault();
          toggleSelect(focusedRecordId);
        }
        break;
      case 'Delete':
      case 'Backspace': {
        const targets = selection.length > 0 ? [...selection] : focusedRecordId ? [focusedRecordId] : [];
        if (targets.length > 0) {
          e.preventDefault();
          void (async () => {
            const ok = await confirmDialog({
              title: `${targets.length}件を削除しますか？`,
              description: '削除後もトーストの「元に戻す」で復元できます。',
              confirmLabel: '削除する',
              destructive: true,
            });
            if (ok) await deleteRecords(targets);
          })();
        }
        break;
      }
    }
  };

  const virtualRows = virtualizer.getVirtualItems();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? virtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end
      : 0;

  return (
    <div
      ref={parentRef}
      className="h-full overflow-auto outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <table className="w-full border-separate border-spacing-0 text-sm" style={{ minWidth: table.getTotalSize() }}>
        <thead className="bg-background sticky top-0 z-10">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((header) => (
                <th
                  key={header.id}
                  style={{ width: header.getSize() }}
                  className="text-muted-foreground relative border-b px-[var(--cell-px)] py-2 text-left text-xs font-semibold whitespace-nowrap select-none"
                >
                  {header.column.getCanSort() ? (
                    <button
                      className="hover:text-foreground inline-flex cursor-pointer items-center gap-1"
                      onClick={header.column.getToggleSortingHandler()}
                      title="クリックでソート（Shift+クリックで複数列ソート）"
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === 'asc' ? (
                        <ArrowUp className="size-3" />
                      ) : header.column.getIsSorted() === 'desc' ? (
                        <ArrowDown className="size-3" />
                      ) : (
                        <ChevronsUpDown className="size-3 opacity-40" />
                      )}
                    </button>
                  ) : (
                    flexRender(header.column.columnDef.header, header.getContext())
                  )}
                  {header.column.getCanResize() && (
                    <div
                      onMouseDown={header.getResizeHandler()}
                      onTouchStart={header.getResizeHandler()}
                      className="hover:bg-ring absolute top-0 right-0 h-full w-1 cursor-col-resize"
                    />
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {paddingTop > 0 && (
            <tr>
              <td style={{ height: paddingTop }} colSpan={columns.length} />
            </tr>
          )}
          {virtualRows.map((vr) => {
            const row = rows[vr.index];
            const isSelected = selectionSet.has(row.original.id);
            const isFocused = focusedRecordId === row.original.id;
            return (
              <tr
                key={row.id}
                ref={(el) => virtualizer.measureElement(el)}
                data-index={vr.index}
                className={cn(
                  'hover:bg-accent/40 cursor-pointer border-b transition-colors',
                  isSelected && 'bg-accent/60',
                  isFocused && 'ring-ring/60 ring-2 ring-inset',
                  row.original.archived === 1 && 'opacity-55',
                )}
                onClick={() => handleRowClick(row)}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    style={{ width: cell.column.getSize() }}
                    className="border-b px-[var(--cell-px)] py-[var(--row-py)] align-middle whitespace-nowrap"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            );
          })}
          {paddingBottom > 0 && (
            <tr>
              <td style={{ height: paddingBottom }} colSpan={columns.length} />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function InlineCellEditor({
  field,
  initial,
  onCommit,
  onCancel,
}: {
  field: FieldDef;
  initial: unknown;
  onCommit: (v: unknown) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState<unknown>(initial);
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter') onCommit(value);
        if (e.key === 'Escape') onCancel();
      }}
      onBlur={(e) => {
        // Select 等のポップアップ内へのフォーカス移動では閉じない
        if (!e.currentTarget.contains(e.relatedTarget)) onCommit(value);
      }}
    >
      <FieldInput
        field={field}
        value={value}
        onChange={(v) => {
          setValue(v);
          if (field.type === 'select') onCommit(v);
        }}
        className="h-7 px-2 py-0 text-sm"
      />
    </div>
  );
}

function FieldValueEditableRating({ record, field }: { record: AppRecord; field: FieldDef }) {
  return (
    <div className="text-center" onClick={(e) => e.stopPropagation()}>
      <FieldValueRating record={record} field={field} />
    </div>
  );
}

function FieldValueRating({ record, field }: { record: AppRecord; field: FieldDef }) {
  return (
    <RatingStars
      value={record.data[field.key]}
      max={field.max ?? 5}
      onChange={(v) => void updateRecord(record.id, { data: { [field.key]: v || '' } }, { silent: true })}
    />
  );
}
