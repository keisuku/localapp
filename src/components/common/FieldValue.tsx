import { ExternalLink } from 'lucide-react';
import type { FieldDef } from '@/core/types/module';
import { formatCurrency, formatDate, formatNumber } from '@/core/utils/format';
import { cn } from '@/core/utils/cn';
import { RatingStars } from './RatingStars';

/** フィールド型に応じた値の表示（テーブル・カード・ドロワー共通） */
export function FieldValue({
  field,
  value,
  truncate = true,
}: {
  field: FieldDef;
  value: unknown;
  truncate?: boolean;
}) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-muted-foreground/50">—</span>;
  }

  switch (field.type) {
    case 'number':
      return <span className="tabular">{formatNumber(value, field.unit)}</span>;
    case 'currency':
      return <span className="tabular">{formatCurrency(value, field.unit)}</span>;
    case 'date':
      return <span className="tabular">{formatDate(value)}</span>;
    case 'rating':
      return <RatingStars value={value} max={field.max ?? 5} />;
    case 'boolean':
      return <span>{value ? 'はい' : 'いいえ'}</span>;
    case 'select': {
      const opt = field.options?.find((o) => o.value === String(value));
      if (!opt) return <span>{String(value)}</span>;
      return (
        <span
          className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium"
          style={{
            borderColor: `color-mix(in srgb, ${opt.color ?? '#94a3b8'} 35%, transparent)`,
            backgroundColor: `color-mix(in srgb, ${opt.color ?? '#94a3b8'} 10%, transparent)`,
          }}
        >
          <span
            className="size-1.5 rounded-full"
            style={{ backgroundColor: opt.color ?? '#94a3b8' }}
          />
          {opt.label}
        </span>
      );
    }
    case 'multiselect': {
      const values = Array.isArray(value) ? value : String(value).split(',');
      return (
        <span className="flex flex-wrap gap-1">
          {values.map((v, i) => (
            <span key={i} className="bg-secondary rounded px-1.5 py-0.5 text-xs">
              {String(v)}
            </span>
          ))}
        </span>
      );
    }
    case 'url': {
      const href = String(value);
      let host = href;
      try {
        host = new URL(href).hostname;
      } catch {
        /* 不正なURLはそのまま表示 */
      }
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary inline-flex items-center gap-1 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="size-3" />
          {host}
        </a>
      );
    }
    default:
      return (
        <span className={cn(truncate && 'block max-w-[320px] truncate')} title={String(value)}>
          {String(value)}
        </span>
      );
  }
}
