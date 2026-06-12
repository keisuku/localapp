import { CheckCircle2, CircleAlert, CopyX, FileWarning, SquareDashed } from 'lucide-react';
import type { ImportSummary } from '@/core/types/import';
import { getModule } from '@/modules';

/** インポート完了後の要約カード */
export function SummaryCard({ summary }: { summary: ImportSummary }) {
  const module = getModule(summary.moduleId);
  const items = [
    {
      icon: <CheckCircle2 className="size-4 text-emerald-600" />,
      label: '取り込み成功',
      value: `${summary.imported}件`,
      strong: true,
    },
    {
      icon: <SquareDashed className="text-muted-foreground size-4" />,
      label: 'スキップ',
      value: `${summary.skipped}件`,
    },
    {
      icon: <CopyX className="size-4 text-amber-600" />,
      label: '重複検出',
      value: `${summary.duplicates}件`,
    },
    {
      icon: <CircleAlert className="size-4 text-orange-600" />,
      label: '異常値',
      value: `${summary.anomalies}件`,
    },
    {
      icon: <FileWarning className="size-4 text-rose-600" />,
      label: '必須項目の空欄',
      value: `${summary.requiredEmpty}件`,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-col items-center gap-2 py-4 text-center">
        <CheckCircle2 className="size-12 text-emerald-500" />
        <div className="text-lg font-bold">
          {summary.imported}件を「{module?.labels.moduleName ?? summary.moduleId}」に取り込みました
        </div>
        <div className="text-muted-foreground text-sm">
          {summary.fileName} ─ 取り込み履歴は設定画面からいつでも確認・取り消しできます
        </div>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {items.map((it) => (
          <div key={it.label} className="rounded-lg border p-2.5 text-center">
            <div className="mb-1 flex justify-center">{it.icon}</div>
            <div className={`tabular text-sm ${it.strong ? 'font-bold' : 'font-medium'}`}>
              {it.value}
            </div>
            <div className="text-muted-foreground mt-0.5 text-[10px]">{it.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
