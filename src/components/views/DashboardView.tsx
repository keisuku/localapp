import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppStore } from '@/core/store/useAppStore';
import type { AppRecord } from '@/core/types/record';
import type { FieldDef, ModuleDefinition } from '@/core/types/module';
import { recordTitle } from '@/core/moduleUtils';
import { ScoreBar } from '@/components/common/ScoreBar';
import { StatusChip } from '@/components/common/StatusChip';
import { formatDateTime } from '@/core/utils/format';

export function DashboardView({
  module,
  records,
}: {
  module: ModuleDefinition;
  fields: FieldDef[];
  records: AppRecord[];
}) {
  const openDrawer = useAppStore((s) => s.openDrawer);

  const statusCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of records) counts.set(r.status, (counts.get(r.status) ?? 0) + 1);
    return module.statuses
      .map((s) => ({ ...s, count: counts.get(s.value) ?? 0 }))
      .filter((s) => s.count > 0);
  }, [records, module]);

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of records) for (const t of r.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  }, [records]);

  const topScored = useMemo(
    () =>
      module.scoring
        ? [...records]
            .filter((r) => r.score !== null)
            .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
            .slice(0, 5)
        : [],
    [records, module],
  );

  const recent = useMemo(
    () => [...records].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5),
    [records],
  );

  const total = records.length || 1;

  return (
    <div className="h-full space-y-4 overflow-y-auto p-4">
      {/* 集計カード */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {module.views.dashboard.statCards.map((card) => (
          <Card key={card.id} className="gap-1 py-3.5">
            <CardHeader className="px-4">
              <CardTitle className="text-muted-foreground text-xs font-medium">
                {card.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              <div className="tabular text-2xl font-bold tracking-tight">
                {card.compute(records)}
              </div>
              {card.hint && <p className="text-muted-foreground mt-0.5 text-xs">{card.hint}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* ステータス内訳 */}
        <Card className="gap-3 py-4">
          <CardHeader className="px-4">
            <CardTitle className="text-sm">ステータス内訳</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4">
            {statusCounts.length === 0 ? (
              <p className="text-muted-foreground text-sm">データがありません</p>
            ) : (
              <>
                <div className="flex h-2.5 w-full overflow-hidden rounded-full">
                  {statusCounts.map((s) => (
                    <div
                      key={s.value}
                      style={{ width: `${(s.count / total) * 100}%`, backgroundColor: s.color }}
                      title={`${s.label}: ${s.count}件`}
                    />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {statusCounts.map((s) => (
                    <div key={s.value} className="flex items-center gap-2 text-xs">
                      <span className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="flex-1">{s.label}</span>
                      <span className="tabular text-muted-foreground">
                        {s.count}件（{Math.round((s.count / total) * 100)}%）
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* スコア上位 */}
        {module.scoring && (
          <Card className="gap-3 py-4">
            <CardHeader className="px-4">
              <CardTitle className="text-sm">スコア上位</CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              {topScored.length === 0 ? (
                <p className="text-muted-foreground text-sm">スコア対象のデータがありません</p>
              ) : (
                <div className="divide-y">
                  {topScored.map((r, i) => (
                    <button
                      key={r.id}
                      className="hover:bg-accent/50 -mx-2 flex w-[calc(100%+1rem)] cursor-pointer items-center gap-3 rounded px-2 py-2 text-left"
                      onClick={() => openDrawer({ mode: 'view', recordId: r.id })}
                    >
                      <span className="text-muted-foreground tabular w-4 text-xs">{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate text-sm">
                        {recordTitle(module, r.data)}
                      </span>
                      <ScoreBar score={r.score} />
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 最近の更新 */}
        <Card className="gap-3 py-4">
          <CardHeader className="px-4">
            <CardTitle className="text-sm">最近の更新</CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            {recent.length === 0 ? (
              <p className="text-muted-foreground text-sm">データがありません</p>
            ) : (
              <div className="divide-y">
                {recent.map((r) => (
                  <button
                    key={r.id}
                    className="hover:bg-accent/50 -mx-2 flex w-[calc(100%+1rem)] cursor-pointer items-center gap-3 rounded px-2 py-2 text-left"
                    onClick={() => openDrawer({ mode: 'view', recordId: r.id })}
                  >
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {recordTitle(module, r.data)}
                    </span>
                    <StatusChip module={module} status={r.status} />
                    <span className="text-muted-foreground tabular shrink-0 text-xs">
                      {formatDateTime(r.updatedAt)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* タグ */}
        <Card className="gap-3 py-4">
          <CardHeader className="px-4">
            <CardTitle className="text-sm">タグ</CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            {tagCounts.length === 0 ? (
              <p className="text-muted-foreground text-sm">タグはまだ使われていません</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {tagCounts.map(([tag, count]) => (
                  <span
                    key={tag}
                    className="bg-secondary inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs"
                  >
                    {tag}
                    <span className="text-muted-foreground tabular">{count}</span>
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
