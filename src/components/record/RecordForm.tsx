import type { FieldDef } from '@/core/types/module';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RatingStars } from '@/components/common/RatingStars';
import { toNumber } from '@/core/utils/format';
import { cn } from '@/core/utils/cn';

const UNSET = '__unset__';

/** FieldDef 駆動の動的フォーム（新規追加・編集・一括編集で共用） */
export function RecordForm({
  fields,
  value,
  onChange,
  errors,
}: {
  fields: FieldDef[];
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  errors?: Record<string, string>;
}) {
  const set = (key: string, v: unknown) => {
    const next = { ...value };
    if (v === undefined || v === '' || v === null) delete next[key];
    else next[key] = v;
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {fields.map((field) => (
        <div key={field.key} className="space-y-1.5">
          <Label htmlFor={`field-${field.key}`} className="text-muted-foreground text-xs">
            {field.label}
            {field.required && <span className="text-destructive">*</span>}
            {field.unit && <span className="opacity-60">（{field.unit}）</span>}
          </Label>
          <FieldInput field={field} value={value[field.key]} onChange={(v) => set(field.key, v)} />
          {errors?.[field.key] && (
            <p className="text-destructive text-xs">{errors[field.key]}</p>
          )}
        </div>
      ))}
    </div>
  );
}

export function FieldInput({
  field,
  value,
  onChange,
  className,
}: {
  field: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
  className?: string;
}) {
  switch (field.type) {
    case 'longtext':
      return (
        <Textarea
          id={`field-${field.key}`}
          value={value == null ? '' : String(value)}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={cn('min-h-20', className)}
        />
      );
    case 'number':
    case 'currency':
      return (
        <Input
          id={`field-${field.key}`}
          type="number"
          inputMode="decimal"
          step="any"
          value={value == null ? '' : String(value)}
          onChange={(e) => onChange(e.target.value === '' ? undefined : toNumber(e.target.value))}
          placeholder={field.placeholder}
          className={cn('tabular', className)}
        />
      );
    case 'date':
      return (
        <Input
          id={`field-${field.key}`}
          type="date"
          value={value == null ? '' : String(value)}
          onChange={(e) => onChange(e.target.value || undefined)}
          className={className}
        />
      );
    case 'boolean':
      return (
        <div className="flex h-9 items-center">
          <Switch checked={!!value} onCheckedChange={onChange} />
        </div>
      );
    case 'rating':
      return (
        <div className="flex h-9 items-center">
          <RatingStars
            value={value}
            max={field.max ?? 5}
            onChange={(v) => onChange(v === 0 ? undefined : v)}
            className="[&_svg]:size-5"
          />
        </div>
      );
    case 'select':
      return (
        <Select
          value={value == null || value === '' ? UNSET : String(value)}
          onValueChange={(v) => onChange(v === UNSET ? undefined : v)}
        >
          <SelectTrigger className={cn('w-full', className)}>
            <SelectValue placeholder="選択してください" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNSET}>
              <span className="text-muted-foreground">未設定</span>
            </SelectItem>
            {(field.options ?? []).map((o) => (
              <SelectItem key={o.value} value={o.value}>
                <span className="flex items-center gap-2">
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: o.color ?? '#94a3b8' }}
                  />
                  {o.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case 'multiselect':
      return (
        <Input
          id={`field-${field.key}`}
          value={Array.isArray(value) ? value.join('、') : value == null ? '' : String(value)}
          onChange={(e) =>
            onChange(
              e.target.value
                ? e.target.value
                    .split(/[,、]/)
                    .map((s) => s.trim())
                    .filter(Boolean)
                : undefined,
            )
          }
          placeholder="カンマ区切りで入力"
          className={className}
        />
      );
    default:
      return (
        <Input
          id={`field-${field.key}`}
          type={field.type === 'url' ? 'url' : 'text'}
          value={value == null ? '' : String(value)}
          onChange={(e) => onChange(e.target.value || undefined)}
          placeholder={field.placeholder ?? (field.type === 'url' ? 'https://…' : undefined)}
          className={className}
        />
      );
  }
}
