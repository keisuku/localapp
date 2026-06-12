import type { ReactNode } from 'react';
import { cn } from '@/core/utils/cn';

/** データが無いときの案内画面（CTA 付き） */
export function EmptyState({
  icon,
  title,
  description,
  actions,
  className,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex h-full min-h-[320px] flex-col items-center justify-center gap-4 p-8 text-center',
        className,
      )}
    >
      <div className="bg-accent text-primary flex size-16 items-center justify-center rounded-2xl [&_svg]:size-8">
        {icon}
      </div>
      <div className="space-y-1.5">
        <h3 className="text-lg font-semibold">{title}</h3>
        {description && (
          <p className="text-muted-foreground mx-auto max-w-sm text-sm leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center justify-center gap-2">{actions}</div>}
    </div>
  );
}
