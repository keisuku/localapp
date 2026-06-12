import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/core/store/useAppStore';
import type { AppRecord } from '@/core/types/record';
import type { FieldDef, ModuleDefinition } from '@/core/types/module';
import { getField, recordTitle } from '@/core/moduleUtils';
import { FieldValue } from '@/components/common/FieldValue';
import { ScoreBar } from '@/components/common/ScoreBar';
import { StatusChip } from '@/components/common/StatusChip';
import { cn } from '@/core/utils/cn';

export function CardView({
  module,
  fields,
  records,
}: {
  module: ModuleDefinition;
  fields: FieldDef[];
  records: AppRecord[];
}) {
  const selection = useAppStore((s) => s.selection);
  const toggleSelect = useAppStore((s) => s.toggleSelect);
  const openDrawer = useAppStore((s) => s.openDrawer);
  const cfg = module.views.card;

  const subtitleField = cfg.subtitleKey ? getField(fields, cfg.subtitleKey) : undefined;
  const badgeField = cfg.badgeKey ? getField(fields, cfg.badgeKey) : undefined;
  const bodyFields = cfg.bodyKeys
    .map((k) => getField(fields, k))
    .filter((f): f is FieldDef => !!f);

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
        {records.map((r) => {
          const selected = selection.includes(r.id);
          return (
            <Card
              key={r.id}
              className={cn(
                'group hover:border-ring/60 cursor-pointer gap-2 py-3 transition-all hover:shadow-md',
                selected && 'border-primary ring-primary/30 ring-2',
                r.archived === 1 && 'opacity-55',
              )}
              onClick={() => openDrawer({ mode: 'view', recordId: r.id })}
            >
              <CardHeader className="gap-1 px-3">
                <div className="flex items-start gap-2">
                  <Checkbox
                    checked={selected}
                    onCheckedChange={() => toggleSelect(r.id)}
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                      'mt-0.5 transition-opacity',
                      !selected && 'opacity-0 group-hover:opacity-100',
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">
                      {recordTitle(module, r.data)}
                    </div>
                    {subtitleField && r.data[subtitleField.key] != null && (
                      <div className="text-muted-foreground truncate text-xs">
                        {String(r.data[subtitleField.key])}
                      </div>
                    )}
                  </div>
                  {badgeField && r.data[badgeField.key] != null && (
                    <FieldValue field={badgeField} value={r.data[badgeField.key]} />
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-1.5 px-3">
                {bodyFields.map((f) => (
                  <div key={f.key} className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground w-16 shrink-0">{f.label}</span>
                    <span className="min-w-0 flex-1 truncate">
                      <FieldValue field={f} value={r.data[f.key]} />
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-2 pt-1.5">
                  <StatusChip module={module} status={r.status} />
                  {module.scoring && <ScoreBar score={r.score} className="max-w-[90px]" />}
                </div>
                {r.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {r.tags.map((t) => (
                      <Badge key={t} variant="secondary" className="px-1.5 py-0 text-[10px]">
                        {t}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
