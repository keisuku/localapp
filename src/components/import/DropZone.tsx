import { useCallback, useEffect, type ReactNode } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileUp } from 'lucide-react';
import { toast } from 'sonner';
import { parseFile, parseClipboardText } from '@/core/import/parseFile';
import { validateBackup } from '@/core/export/backup';
import { restoreBackup } from '@/core/db/mutations';
import { confirmDialog } from '@/core/store/confirmStore';
import { registerFilePicker } from '@/core/importController';
import { useAppStore } from '@/core/store/useAppStore';
import { formatDateTime } from '@/core/utils/format';

/**
 * アプリ全体を覆うドロップゾーン。
 * - 画面のどこにファイルを落としてもインポートウィザードが起動
 * - バックアップJSONを落とすと復元フローへ自動分岐
 * - Excel からのセル貼り付け（Ctrl+V）にも対応
 */
export function DropZone({ children }: { children: ReactNode }) {
  const openWizard = useAppStore((s) => s.openWizard);

  const handleFiles = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;
      try {
        const result = await parseFile(file);
        if (result.kind === 'backup') {
          const err = validateBackup(result.backup);
          if (err) {
            toast.error(err);
            return;
          }
          const ok = await confirmDialog({
            title: 'バックアップから復元しますか？',
            description: `このファイルはバックアップデータです（${result.backup.records.length}件 / ${formatDateTime(result.backup.exportedAt)} 作成）。\n現在のデータはすべて置き換えられます。復元後も「元に戻す」で取り消せます。`,
            confirmLabel: '復元する',
            destructive: true,
          });
          if (ok) await restoreBackup(result.backup);
          return;
        }
        if (result.table.rows.length === 0) {
          toast.error('データ行が見つかりませんでした');
          return;
        }
        openWizard(result.table);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'ファイルの読み込みに失敗しました');
      }
    },
    [openWizard],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop: (accepted) => void handleFiles(accepted),
    noClick: true,
    noKeyboard: true,
    multiple: false,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
      'text/tab-separated-values': ['.tsv'],
      'application/json': ['.json'],
    },
  });

  useEffect(() => {
    registerFilePicker(open);
  }, [open]);

  // Excel からコピーしたセル範囲の貼り付け取り込み
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.closest('input, textarea, [contenteditable], [role=dialog]') ||
          target.isContentEditable)
      ) {
        return;
      }
      const text = e.clipboardData?.getData('text/plain');
      if (!text) return;
      const table = parseClipboardText(text);
      if (table) {
        e.preventDefault();
        openWizard(table);
        toast.info('クリップボードの表データを読み取りました');
      }
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [openWizard]);

  return (
    <div {...getRootProps()} className="relative flex h-screen w-full overflow-hidden">
      <input {...getInputProps()} />
      {children}
      {isDragActive && (
        <div className="bg-primary/85 pointer-events-none absolute inset-0 z-100 flex flex-col items-center justify-center gap-4 backdrop-blur-sm">
          <div className="rounded-2xl border-2 border-dashed border-white/60 p-10 text-center">
            <FileUp className="mx-auto mb-4 size-12 text-white" />
            <div className="text-xl font-bold text-white">ファイルをドロップして取り込む</div>
            <div className="mt-1 text-sm text-white/80">
              Excel (.xlsx) / CSV / JSON ─ 取り込み先は自動判定されます
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
