import { useState } from 'react';
import { Bookmark, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/core/store/useAppStore';
import { useSavedFilters } from '@/core/db/queries';
import { saveFilter, deleteSavedFilter } from '@/core/db/mutations';
import { OP_LABELS, opsForField } from '@/core/search/filterRecords';
import { getField } from '@/core/moduleUtils';
import type { FilterCondition } from '@/core/types/record';
import type { FieldDef, ModuleDefinition } from '@/core/types/module';

const META_FIELDS = [
  { key: '$status', label: 'ステータス' },
  { key: '$tags', label: 'タグ' },
  { key: '$score', label: 'スコア' },
];

/** 右側のフィルターパネル（条件の追加・保存・呼び出し） */
export function FilterPanel({
  module,
  fields,
}: {
  module: ModuleDefinition;
  fields: FieldDef[];
}) {
  const conditions = useAppStore((s) => s.conditions);
  const setConditions = useAppStore((s) => s.setConditions);
  const search = useAppStore((s) => s.search);
  const setSearch = useAppStore((s) => s.setSearch);
  const toggleFilterPanel = useAppStore((s) => s.toggleFilterPanel);
  const savedFilters = useSavedFilters(module.id);
  const [saveName, setSaveName] = useState('');

  const update = (i: number, patch: Partial<FilterCondition>) => {
    setConditions(conditions.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  };

  const fieldOptions = [...META_FIELDS, ...fields.map((f) => ({ key: f.key, label: f.label }))];

  const valueEditor = (cond: FilterCondition, i: number) => {
    if (cond.op === 'empty' || cond.op === 'notEmpty') return null;
    if (cond.fieldKey === '$status') {
      return (
        <Select value={cond.value || undefined} onValueChange={(v) => update(i, { value: v })}>
          <SelectTrigger size="sm" className="w-full">
            <SelectValue placeholder="ステータスを選択" />
          </SelectTrigger>
          <SelectContent>
            {module.statuses.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    const field = getField(fields, cond.fieldKey);
    if (field?.type === 'select' && field.options?.length) {
      return (
        <Select value={cond.value || undefined} onValueChange={(v) => update(i, { value: v })}>
          <SelectTrigger size="sm" className="w-full">
            <SelectValue placeholder="値を選択" />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    const isNumeric =
      cond.fieldKey === '$score' ||
      field?.type === 'number' ||
      field?.type === 'currency' ||
      field?.type === 'rating';
    return (
      <Input
        type={field?.type === 'date' ? 'date' : isNumeric ? 'number' : 'text'}
        value={cond.value ?? ''}
        onChange={(e) => update(i, { value: e.target.value })}
        placeholder="値"
        className="h-8"
      />
    );
  };

  return (
    <aside className="bg-card flex w-72 shrink-0 flex-col border-l">
      <div className="flex items-center justify-between border-b px-3 py-2.5">
        <span className="text-sm font-semibold">フィルター</span>
        <Button variant="ghost" size="iconSm" onClick={toggleFilterPanel}>
          <X />
        </Button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {conditions.map((cond, i) => {
          const field = getField(fields, cond.fieldKey);
          const meta = cond.fieldKey.startsWith('$') ? cond.fieldKey : undefined;
          const ops = opsForField(field, meta);
          return (
            <div key={i} className="bg-muted/40 space-y-2 rounded-lg border p-2.5">
              <div className="flex items-center gap-1.5">
                <Select
                  value={cond.fieldKey}
                  onValueChange={(v) => {
                    const newField = getField(fields, v);
                    const newOps = opsForField(newField, v.startsWith('$') ? v : undefined);
                    update(i, { fieldKey: v, op: newOps[0], value: '' });
                  }}
                >
                  <SelectTrigger size="sm" className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fieldOptions.map((f) => (
                      <SelectItem key={f.key} value={f.key}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="iconSm"
                  onClick={() => setConditions(conditions.filter((_, idx) => idx !== i))}
                >
                  <X />
                </Button>
              </div>
              <Select
                value={cond.op}
                onValueChange={(v) => update(i, { op: v as FilterCondition['op'] })}
              >
                <SelectTrigger size="sm" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ops.map((op) => (
                    <SelectItem key={op} value={op}>
                      {OP_LABELS[op]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {valueEditor(cond, i)}
            </div>
          );
        })}

        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() =>
            setConditions([...conditions, { fieldKey: '$status', op: 'equals', value: '' }])
          }
        >
          <Plus className="size-4" />
          条件を追加
        </Button>

        {(conditions.length > 0 || search) && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground w-full"
            onClick={() => {
              setConditions([]);
              setSearch('');
            }}
          >
            すべての条件をクリア
          </Button>
        )}

        <Separator />

        <div className="space-y-2">
          <div className="text-muted-foreground text-xs font-semibold">保存済みフィルター</div>
          {(savedFilters ?? []).length === 0 && (
            <p className="text-muted-foreground/70 text-xs">
              よく使う条件は名前を付けて保存できます
            </p>
          )}
          {(savedFilters ?? []).map((sf) => (
            <div key={sf.id} className="group flex items-center gap-1">
              <button
                className="hover:bg-accent flex flex-1 cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm"
                onClick={() => {
                  setConditions(sf.conditions);
                  if (sf.search !== undefined) setSearch(sf.search);
                }}
              >
                <Bookmark className="text-primary size-3.5" />
                <span className="truncate">{sf.name}</span>
                <span className="text-muted-foreground tabular ml-auto text-xs">
                  {sf.conditions.length}条件
                </span>
              </button>
              <Button
                variant="ghost"
                size="iconSm"
                className="opacity-0 group-hover:opacity-100"
                onClick={() => void deleteSavedFilter(sf.id)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}

          {conditions.length > 0 && (
            <form
              className="flex gap-1.5 pt-1"
              onSubmit={(e) => {
                e.preventDefault();
                if (!saveName.trim()) return;
                void saveFilter({
                  moduleId: module.id,
                  name: saveName.trim(),
                  conditions,
                  search,
                });
                setSaveName('');
              }}
            >
              <Input
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="現在の条件に名前を付ける"
                className="h-8 text-xs"
              />
              <Button type="submit" size="sm" variant="secondary" disabled={!saveName.trim()}>
                保存
              </Button>
            </form>
          )}
        </div>
      </div>
    </aside>
  );
}
