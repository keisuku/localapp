import { Star } from 'lucide-react';
import { cn } from '@/core/utils/cn';
import { toNumber } from '@/core/utils/format';

export function RatingStars({
  value,
  max = 5,
  onChange,
  className,
}: {
  value: unknown;
  max?: number;
  onChange?: (v: number) => void;
  className?: string;
}) {
  const n = toNumber(value) ?? 0;
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)}>
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          className={cn(
            'size-3.5',
            i < n ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40',
            onChange && 'cursor-pointer hover:scale-110 transition-transform',
          )}
          onClick={
            onChange
              ? (e) => {
                  e.stopPropagation();
                  onChange(i + 1 === n ? 0 : i + 1);
                }
              : undefined
          }
        />
      ))}
    </span>
  );
}
