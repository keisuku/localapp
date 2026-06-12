import { useRef, useState } from 'react';
import {
  Code2,
  Database,
  Download,
  FileDown,
  FileUp,
  History,
  Monitor,
  Moon,
  Palette,
  ShieldCheck,
  Sun,
  Trash2,
  Undo2,
  Wrench,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { moduleRegistry, getModule } from '@/modules';
import { useImportHistory, useRecordCount, useSettingValue } from '@/core/db/queries';
import { clearAllData, clearModule, restoreBackup, revertImport } from '@/core/db/mutations';
import { exportBackup, validateBackup } from '@/core/export/backup';
import { generateModuleScaffold } from '@/core/export/scaffold';
import { isBackupShape } from '@/core/import/parseFile';
import { confirmDialog } from '@/core/store/confirmStore';
import { usePrefsStore, type ThemePref } from '@/core/store/prefs';
import { customFieldsKey, mergeFields, type CustomFieldDef } from '@/core/moduleUtils';
import { formatDateTime } from '@/core/utils/format';
import { FieldEditor } from './FieldEditor';

/** 設定・データ管理画面 */
export function SettingsView() {
  const fileRef = useRef<HTMLInputElement>(null);
  const history = useImportHistory();
  const totalCount = useRecordCount();
  const { theme, setTheme, density, setDensity } = usePrefsStore();
  const [editorModuleId, setEditorModuleId] = useState(moduleRegistry[0]?.id ?? 'generic');
  const editorCustom = useSettingValue<CustomFieldDef[]>(customFieldsKey(editorModuleId));

  const handleRestoreFile = async (file: File) => {
    try {
      const obj: unknown = JSON.parse(await file.text());
      if (!isBackupShape(obj)) {
        toast.error('バックアップファイルではありません');
        return;
      }
      const err = validateBackup(obj);
      if (err) {
        toast.error(err);
        return;
      }
      const ok = await confirmDialog({
        title: 'バックアップから復元しますか？',
        description: `${obj.records.length}件のデータ（${formatDateTime(obj.exportedAt)} 作成）で現在のデータをすべて置き換えます。\n復元後も「元に戻す」で取り消せます。`,
        confirmLabel: '復元する',
        destructive: true,
      });
      if (ok) await restoreBackup(obj);
    } catch {
      toast.error('ファイルの読み込みに失敗しました');
    }
  };

  const copyScaffold = async () => {
    const module = getModule(editorModuleId);
    if (!module) return;
    const code = generateModuleScaffold(module, mergeFields(module, editorCustom));
    await navigator.clipboard.writeText(code);
    toast.success('モジュール雛形コードをクリップボードにコピーしました');
  };

  const offlineUrl = `${import.meta.env.BASE_URL}local-app-studio-offline.html`;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-4 p-4 pb-12">
        {/* オフライン版 */}
        <Card className="border-primary/30 bg-accent/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileDown className="text-primary size-4.5" />
              オフライン版をダウンロード
            </CardTitle>
            <CardDescription>
              アプリ全体を 1 つの HTML ファイルとして保存できます。ダウンロードしたファイルを
              ダブルクリックするだけで、インターネット接続なしでこのアプリをそのまま使えます。
              社内 PC への配布にも便利です。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <a href={offlineUrl} download="local-app-studio-offline.html">
                <Download className="size-4" />
                オフライン版（単一HTML）をダウンロード
              </a>
            </Button>
            {import.meta.env.DEV && (
              <p className="text-muted-foreground mt-2 text-xs">
                ※ 開発サーバーでは利用できません（ビルド版 / 公開版で有効）
              </p>
            )}
          </CardContent>
        </Card>

        {/* バックアップ */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="text-primary size-4.5" />
              バックアップと復元
            </CardTitle>
            <CardDescription>
              データはこの PC のブラウザ内（IndexedDB）にのみ保存されています。
              ブラウザのデータ消去で失われるため、定期的なバックアップをおすすめします。
              現在 {totalCount ?? 0} 件のレコードを保存中。
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button onClick={() => void exportBackup()}>
              <Download className="size-4" />
              バックアップを保存（JSON）
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <FileUp className="size-4" />
              バックアップから復元
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleRestoreFile(f);
                e.target.value = '';
              }}
            />
          </CardContent>
        </Card>

        {/* 取り込み履歴 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="text-primary size-4.5" />
              取り込み履歴
            </CardTitle>
            <CardDescription>過去のインポートを確認し、まとめて取り消せます。</CardDescription>
          </CardHeader>
          <CardContent>
            {(history ?? []).length === 0 ? (
              <p className="text-muted-foreground text-sm">まだ取り込み履歴はありません</p>
            ) : (
              <div className="divide-y">
                {(history ?? []).slice(0, 20).map((h) => {
                  const m = getModule(h.moduleId);
                  return (
                    <div key={h.id} className="flex items-center gap-3 py-2 text-sm">
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{h.fileName}</div>
                        <div className="text-muted-foreground text-xs">
                          {m?.labels.moduleName ?? h.moduleId} ─ {formatDateTime(h.importedAt)} ─{' '}
                          {h.rowCount}件取込
                          {h.skippedCount > 0 && ` / ${h.skippedCount}件スキップ`}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          void (async () => {
                            const ok = await confirmDialog({
                              title: 'このインポートを取り消しますか？',
                              description: `「${h.fileName}」で取り込んだ ${h.rowCount}件のレコードを削除します。`,
                              confirmLabel: '取り消す',
                              destructive: true,
                            });
                            if (ok) await revertImport(h.id);
                          })()
                        }
                      >
                        <Undo2 className="size-4" />
                        取り消す
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 項目のカスタマイズ */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wrench className="text-primary size-4.5" />
              項目のカスタマイズ
            </CardTitle>
            <CardDescription>
              コードを書かずにモジュールへ項目を追加できます。追加した項目はフォーム・テーブル・
              インポートのマッピングにすぐ反映されます。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={editorModuleId} onValueChange={setEditorModuleId}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {moduleRegistry.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.labels.moduleName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldEditor moduleId={editorModuleId} />
            <div className="bg-muted/40 flex items-center justify-between rounded-lg border p-3">
              <div className="text-xs">
                <div className="font-semibold">この構成をコードとして書き出す</div>
                <div className="text-muted-foreground mt-0.5">
                  試した構成を新モジュール（schema.ts / labels.ts）の雛形として横展開できます
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => void copyScaffold()}>
                <Code2 className="size-4" />
                雛形をコピー
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 外観 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Palette className="text-primary size-4.5" />
              外観
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-6">
            <div className="space-y-1.5">
              <div className="text-muted-foreground text-xs font-medium">テーマ</div>
              <Tabs value={theme} onValueChange={(v) => setTheme(v as ThemePref)}>
                <TabsList>
                  <TabsTrigger value="light" className="gap-1 px-3">
                    <Sun className="size-3.5" />
                    ライト
                  </TabsTrigger>
                  <TabsTrigger value="dark" className="gap-1 px-3">
                    <Moon className="size-3.5" />
                    ダーク
                  </TabsTrigger>
                  <TabsTrigger value="system" className="gap-1 px-3">
                    <Monitor className="size-3.5" />
                    自動
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="space-y-1.5">
              <div className="text-muted-foreground text-xs font-medium">表示密度</div>
              <Tabs
                value={density}
                onValueChange={(v) => setDensity(v as 'comfort' | 'compact')}
              >
                <TabsList>
                  <TabsTrigger value="comfort" className="px-3">
                    標準
                  </TabsTrigger>
                  <TabsTrigger value="compact" className="px-3">
                    コンパクト
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        {/* データの保存について */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="text-primary size-4.5" />
              データの保存について
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-1.5 text-sm">
            <p>・データはこの PC のブラウザ内（IndexedDB）にのみ保存されます。</p>
            <p>・外部サーバーへの送信は一切ありません。オフラインでも全機能が動作します。</p>
            <p>・すべての操作は即時に自動保存されます（右下に保存時刻を表示）。</p>
            <p>・ブラウザの「閲覧データの削除」でデータが消えるため、バックアップを推奨します。</p>
          </CardContent>
        </Card>

        {/* 危険な操作 */}
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2 text-base">
              <Trash2 className="size-4.5" />
              危険な操作
            </CardTitle>
            <CardDescription>実行前に必ず確認ダイアログが表示されます。</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {moduleRegistry.map((m) => (
              <Button
                key={m.id}
                variant="outline"
                size="sm"
                className="text-destructive"
                onClick={() =>
                  void (async () => {
                    const ok = await confirmDialog({
                      title: `「${m.labels.moduleName}」のデータを全削除しますか？`,
                      description:
                        'このモジュールのレコードをすべて削除します。直後であれば「元に戻す」で復元できます。',
                      confirmLabel: '全削除する',
                      destructive: true,
                    });
                    if (ok) await clearModule(m.id);
                  })()
                }
              >
                {m.labels.moduleName}を初期化
              </Button>
            ))}
            <Button
              variant="destructive"
              size="sm"
              onClick={() =>
                void (async () => {
                  const ok = await confirmDialog({
                    title: 'すべてのデータを初期化しますか？',
                    description:
                      '全モジュールのレコード・取り込み履歴・保存フィルターを削除します。\n事前のバックアップをおすすめします。直後であれば「元に戻す」で復元できます。',
                    confirmLabel: 'すべて初期化する',
                    destructive: true,
                  });
                  if (ok) await clearAllData();
                })()
              }
            >
              すべてのデータを初期化
            </Button>
          </CardContent>
        </Card>

        <p className="text-muted-foreground/60 pt-2 text-center text-xs">
          Local App Studio v1.0 ─ ローカル完結・モジュール拡張型の業務アプリ基盤
        </p>
      </div>
    </div>
  );
}
