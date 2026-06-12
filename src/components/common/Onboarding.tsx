import { useEffect, useState } from 'react';
import { FileSpreadsheet, Database, KeyboardIcon, Sparkles, Upload } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getSetting, setSetting } from '@/core/db/db';
import { db } from '@/core/db/db';
import { loadSampleData } from '@/core/db/mutations';
import { useAppStore } from '@/core/store/useAppStore';

/** 初回起動時のオンボーディング。サンプルデータで即座に体験できるようにする */
export function Onboarding({ onImportFile }: { onImportFile: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useAppStore((s) => s.navigate);

  useEffect(() => {
    void (async () => {
      const done = await getSetting<boolean>('onboardingDone');
      if (done) return;
      const count = await db.records.count();
      if (count === 0) setOpen(true);
      else await setSetting('onboardingDone', true);
    })();
  }, []);

  const finish = async () => {
    await setSetting('onboardingDone', true);
    setOpen(false);
  };

  const trySample = async () => {
    setLoading(true);
    try {
      await loadSampleData();
      await finish();
      navigate({ kind: 'module', moduleId: 'jobs', view: 'dashboard' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && void finish()}>
      <DialogContent className="sm:max-w-2xl" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-xl">Local App Studio へようこそ</DialogTitle>
          <DialogDescription>
            Excel / CSV / JSON を取り込んで、ブラウザの中だけで完結するデータ管理アプリです。
            データはこの PC の中（ブラウザの IndexedDB）にのみ保存され、外部には一切送信されません。
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 py-2">
          <div className="rounded-lg border p-3">
            <FileSpreadsheet className="text-primary mb-2 size-5" />
            <div className="text-sm font-medium">ドラッグ&ドロップで取込</div>
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
              画面のどこにファイルを落としても、取り込み先を自動判定します
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <Database className="text-primary mb-2 size-5" />
            <div className="text-sm font-medium">自動保存・自動スコア</div>
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
              すべての操作は即保存。求人や案件は自動でスコアリングされます
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <KeyboardIcon className="text-primary mb-2 size-5" />
            <div className="text-sm font-medium">Ctrl+K で何でも実行</div>
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
              コマンドパレットから検索・追加・出力まで操作できます
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <Button size="lg" className="h-12 w-full text-base" onClick={() => void trySample()} disabled={loading}>
            <Sparkles className="size-5" />
            {loading ? '読み込み中…' : 'サンプルデータで試す'}
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                void finish();
                onImportFile();
              }}
            >
              <Upload className="size-4" />
              自分のファイルを取り込む
            </Button>
            <Button variant="ghost" className="flex-1" onClick={() => void finish()}>
              あとで（空の状態から始める）
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
