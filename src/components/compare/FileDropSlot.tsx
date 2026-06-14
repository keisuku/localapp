import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileUp, CheckCircle2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { parseFile } from '@/core/import/parseFile';
import type { ParsedTable } from '@/core/types/import';
import { Button } from '@/components/ui/button';
import { cn } from '@/core/utils/cn';

const ACCEPT = {
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls'],
  'text/csv': ['.csv'],
  'text/tab-separated-values': ['.tsv'],
  'application/json': ['.json'],
};

/** 比較ページの「ファイル投入枠」。D&D したくなる動きと、状態が一目で分かる表示を持つ。 */
export function FileDropSlot({
  badge,
  title,
  table,
  onLoaded,
}: {
  badge: string;
  title: string;
  table: ParsedTable | null;
  onLoaded: (table: ParsedTable) => void;
}) {
  const handleFiles = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;
      try {
        const result = await parseFile(file);
        if (result.kind !== 'table') {
          toast.error('これはバックアップファイルです。比較には表データ（Excel/CSV）を入れてください。');
          return;
        }
        if (result.table.rows.length === 0) {
          toast.error('データ行が見つかりませんでした');
          return;
        }
        onLoaded(result.table);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'ファイルの読み込みに失敗しました');
      }
    },
    [onLoaded],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop: (accepted) => void handleFiles(accepted),
    multiple: false,
    accept: ACCEPT,
  });

  if (table) {
    return (
      <div className="border-ring/50 bg-card flex flex-col gap-3 rounded-xl border-2 p-4 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="bg-primary text-primary-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold">
            {badge}
          </span>
          <span className="text-sm font-semibold">{title}</span>
          <CheckCircle2 className="text-primary ml-auto size-5" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium" title={table.sourceName}>
            {table.sourceName}
          </div>
          <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="bg-muted tabular rounded-full px-1.5 py-0.5">{table.rows.length} 行</span>
            <span className="bg-muted rounded-full px-1.5 py-0.5">{table.headers.length} 列</span>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="self-start" onClick={() => open()}>
          <RefreshCw className="size-4" />
          差し替える
        </Button>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        'group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-all',
        'hover:border-ring hover:bg-accent/40 hover:scale-[1.01]',
        isDragActive
          ? 'border-primary bg-primary/5 scale-[1.01]'
          : 'border-input',
      )}
    >
      <input {...getInputProps()} />
      <span className="bg-accent text-primary mb-1 flex size-7 items-center justify-center rounded-full text-xs font-bold">
        {badge}
      </span>
      <div
        className={cn(
          'bg-accent text-primary flex size-12 items-center justify-center rounded-2xl transition-transform group-hover:-translate-y-0.5',
          !isDragActive && 'animate-pulse',
        )}
      >
        <FileUp className="size-6" />
      </div>
      <div className="text-sm font-semibold">{title}</div>
      <div className="text-muted-foreground text-xs leading-relaxed">
        ここにドラッグ＆ドロップ
        <br />
        またはクリックで選択（Excel / CSV）
      </div>
    </div>
  );
}
