import { cn } from '@/core/utils/cn';
import type { ModuleDefinition } from '@/core/types/module';
import { statusDef } from '@/core/moduleUtils';

export function StatusChip({
  module,
  status,
  className,
}: {
  module: ModuleDefinition;
  status: string;
  className?: string;
}) {
  const def = statusDef(module, status);
  const color = def?.color ?? '#94a3b8';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        className,
      )}
      style={{
        borderColor: `color-mix(in srgb, ${color} 35%, transparent)`,
        backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)`,
      }}
    >
      <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
      {def?.label ?? status}
    </span>
  );
}
