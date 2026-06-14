import { Settings, LayoutGrid, GitCompareArrows } from 'lucide-react';
import { moduleRegistry } from '@/modules';
import { useAppStore } from '@/core/store/useAppStore';
import { useModuleCounts } from '@/core/db/queries';
import { ModuleIcon } from '@/components/common/Icon';
import { cn } from '@/core/utils/cn';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function Sidebar() {
  const route = useAppStore((s) => s.route);
  const navigate = useAppStore((s) => s.navigate);
  const counts = useModuleCounts();

  return (
    <aside className="bg-sidebar text-sidebar-foreground flex w-60 shrink-0 flex-col border-r border-sidebar-border">
      <div className="flex items-center gap-2.5 px-4 py-4">
        <div className="bg-sidebar-accent flex size-8 items-center justify-center rounded-lg">
          <LayoutGrid className="text-sidebar-accent-foreground size-4.5" />
        </div>
        <div className="leading-tight">
          <div className="text-sidebar-accent-foreground text-sm font-bold tracking-wide">
            Local App Studio
          </div>
          <div className="text-[10px] opacity-60">ローカル業務アプリ基盤</div>
        </div>
      </div>

      <div className="px-3 pt-2 pb-1 text-[10px] font-semibold tracking-wider uppercase opacity-50">
        モジュール
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2">
        {moduleRegistry.map((m) => {
          const active = route.kind === 'module' && route.moduleId === m.id;
          return (
            <Tooltip key={m.id}>
              <TooltipTrigger asChild>
                <button
                  className={cn(
                    'flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors',
                    active
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                      : 'hover:bg-sidebar-accent/50',
                  )}
                  onClick={() =>
                    navigate({
                      kind: 'module',
                      moduleId: m.id,
                      view: route.kind === 'module' && active ? route.view : 'dashboard',
                    })
                  }
                >
                  <ModuleIcon name={m.labels.icon} className="size-4 shrink-0" />
                  <span className="flex-1 truncate text-left">{m.labels.moduleName}</span>
                  {counts?.[m.id] !== undefined && counts[m.id] > 0 && (
                    <span
                      className={cn(
                        'tabular rounded-full px-1.5 py-0.5 text-[10px]',
                        active ? 'bg-sidebar/60' : 'bg-sidebar-accent/60',
                      )}
                    >
                      {counts[m.id]}
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{m.labels.description}</TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      <div className="border-sidebar-border space-y-0.5 border-t p-2">
        <button
          className={cn(
            'flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors',
            route.kind === 'compare'
              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
              : 'hover:bg-sidebar-accent/50',
          )}
          onClick={() => navigate({ kind: 'compare' })}
        >
          <GitCompareArrows className="size-4" />
          予実・差分ツール
        </button>
        <button
          className={cn(
            'flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors',
            route.kind === 'settings'
              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
              : 'hover:bg-sidebar-accent/50',
          )}
          onClick={() => navigate({ kind: 'settings' })}
        >
          <Settings className="size-4" />
          設定・データ管理
        </button>
      </div>
    </aside>
  );
}
