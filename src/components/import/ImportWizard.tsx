import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, ArrowRight, Check, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { db, getSetting, setSetting } from '@/core/db/db';
import { useAppStore } from '@/core/store/useAppStore';
import { moduleRegistry, getModule } from '@/modules';
import { inferColumns } from '@/core/import/inferColumns';
import { matchModules, bestModule, buildInitialMapping } from '@/core/import/matchModule';
import { buildRowData, validateRows } from '@/core/import/validate';
import { commitImport, type SkipOptions } from '@/core/import/commit';
import { SKIP_COLUMN, type ColumnMapping, type ImportSummary } from '@/core/types/import';
import {
  mergeFields,
  customFieldsKey,
  type CustomFieldDef,
} from '@/core/moduleUtils';
import { ModuleIcon } from '@/components/common/Icon';
import { PreviewTable } from './PreviewTable';
import { SummaryCard } from './SummaryCard';
import { toast } from 'sonner';
import { cn } from '@/core/utils/cn';

const NEW_FIELD = '__new__';

const STEPS = ['取込先の確認', '列のマッピング', 'データチェック', '完了'] as const;

/** ドロップ/選択したファイルの取り込みウィザード（4ステップ） */
export function ImportWizard() {
  const table = useAppStore((s) => s.wizardTable);
  const closeWizard = useAppStore((s) => s.closeWizard);
  const navigate = useAppStore((s) => s.navigate);

  const [step, setStep] = useState(0);
  const [moduleId, setModuleId] = useState('generic');
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [skips, setSkips] = useState<SkipOptions>({
    skipRequiredEmpty: true,
    skipDuplicates: true,
    skipAnomalies: false,
  });
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [committing, setCommitting] = useState(false);

  const columns = useMemo(() => (table ? inferColumns(table) : []), [table]);

  const customFields = useLiveQuery(
    () => getSetting<CustomFieldDef[]>(customFieldsKey(moduleId)),
    [moduleId],
  );

  const module = getModule(moduleId);
  const fields = useMemo(
    () => (module ? mergeFields(module, customFields) : []),
    [module, customFields],
  );

  const matches = useMemo(() => {
    if (columns.length === 0) return [];
    return matchModules(columns);
  }, [columns]);

  // ファイルが変わったら自動判定をやり直す
  useEffect(() => {
    if (!table) {
      setStep(0);
      setSummary(null);
      return;
    }
    const best = bestModule(matchModules(inferColumns(table)));
    setModuleId(best);
    setStep(0);
    setSummary(null);
    setSkips({ skipRequiredEmpty: true, skipDuplicates: true, skipAnomalies: false });
  }, [table]);

  // モジュールが変わったらマッピングを作り直す
  useEffect(() => {
    if (!table || !module) return;
    setMapping(buildInitialMapping(inferColumns(table), module, mergeFields(module, customFields)));
  }, [table, module, customFields]);

  const existing = useLiveQuery(
    () => db.records.where('moduleId').equals(moduleId).toArray(),
    [moduleId],
  );

  const report = useMemo(() => {
    if (!table || step < 2) return null;
    const rows = buildRowData(table, mapping);
    return validateRows(rows, fields, existing ?? []);
  }, [table, mapping, fields, existing, step]);

  if (!table) return null;

  const mappedCount = Object.values(mapping).filter(
    (v) => v !== SKIP_COLUMN && v !== NEW_FIELD,
  ).length;
  const newFieldCount = Object.values(mapping).filter((v) => v === NEW_FIELD).length;

  const doCommit = async () => {
    if (!module || !report) return;
    setCommitting(true);
    try {
      // 「新しい項目として追加」が選ばれた列をカスタムフィールド化する
      let effectiveMapping = mapping;
      let effectiveFields = fields;
      const newCols = Object.entries(mapping).filter(([, v]) => v === NEW_FIELD);
      if (newCols.length > 0) {
        const existingKeys = new Set(fields.map((f) => f.key));
        const added: CustomFieldDef[] = [];
        effectiveMapping = { ...mapping };
        for (const [idxStr] of newCols) {
          const idx = Number(idxStr);
          const col = columns[idx];
          let key = col.header.trim() || `列${idx + 1}`;
          while (existingKeys.has(key)) key = `${key}_2`;
          existingKeys.add(key);
          const type =
            col.guessedType === 'select' ? 'text' : col.guessedType;
          added.push({ key, label: col.header, type, showInTable: true });
          effectiveMapping[idx] = key;
        }
        const nextCustom = [...(customFields ?? []), ...added];
        await setSetting(customFieldsKey(moduleId), nextCustom);
        effectiveFields = module ? mergeFields(module, nextCustom) : fields;
      }

      const rows = buildRowData(table, effectiveMapping);
      const freshReport = validateRows(rows, effectiveFields, existing ?? []);
      const result = await commitImport({
        table,
        mapping: effectiveMapping,
        moduleId,
        fields: effectiveFields,
        report: freshReport,
        skips,
      });
      setSummary(result);
      setStep(3);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '取り込みに失敗しました');
    } finally {
      setCommitting(false);
    }
  };

  const issueRows = report
    ? new Set([
        ...report.rows.requiredEmpty,
        ...report.rows.duplicateInFile,
        ...report.rows.duplicateExisting,
        ...report.rows.anomaly,
      ])
    : new Set<number>();

  return (
    <Dialog open={!!table} onOpenChange={(v) => !v && closeWizard()}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-4 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>ファイルの取り込み</DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <span className="truncate">{table.sourceName}</span>
            <span className="tabular shrink-0">─ {table.rows.length}行 × {table.headers.length}列</span>
            {table.activeSheet && (
              <span className="shrink-0">（シート: {table.activeSheet}）</span>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* ステップインジケーター */}
        <div className="flex items-center gap-1">
          {STEPS.map((label, i) => (
            <div key={label} className="flex flex-1 items-center gap-1">
              <div
                className={cn(
                  'flex size-5.5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                  i < step || (step === 3 && i === 3)
                    ? 'bg-emerald-500 text-white'
                    : i === step
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground',
                )}
              >
                {i < step ? <Check className="size-3" /> : i + 1}
              </div>
              <span
                className={cn(
                  'text-xs whitespace-nowrap',
                  i === step ? 'font-semibold' : 'text-muted-foreground',
                )}
              >
                {label}
              </span>
              {i < STEPS.length - 1 && <div className="bg-border mx-1 h-px flex-1" />}
            </div>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <div className="mb-2 text-sm font-semibold">取り込み先モジュール</div>
                <div className="grid grid-cols-3 gap-2">
                  {moduleRegistry.map((m) => {
                    const match = matches.find((x) => x.moduleId === m.id);
                    const isBest = matches[0]?.moduleId === m.id && (matches[0]?.score ?? 0) >= 0.4;
                    return (
                      <button
                        key={m.id}
                        className={cn(
                          'cursor-pointer rounded-lg border p-3 text-left transition-all',
                          moduleId === m.id
                            ? 'border-primary ring-primary/30 bg-accent/50 ring-2'
                            : 'hover:border-ring/50',
                        )}
                        onClick={() => setModuleId(m.id)}
                      >
                        <div className="flex items-center gap-2">
                          <ModuleIcon name={m.labels.icon} className="text-primary size-4" />
                          <span className="text-sm font-semibold">{m.labels.moduleName}</span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-1.5">
                          {isBest && (
                            <Badge className="gap-1 px-1.5 text-[10px]">
                              <Sparkles className="size-2.5" />
                              自動判定
                            </Badge>
                          )}
                          {match && match.matchedFields > 0 && (
                            <span className="text-muted-foreground tabular text-[10px]">
                              {match.matchedFields}列が一致
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <div className="mb-2 text-sm font-semibold">プレビュー（先頭5行）</div>
                <PreviewTable table={table} />
              </div>
            </div>
          )}

          {step === 1 && module && (
            <div className="space-y-2">
              <p className="text-muted-foreground text-xs">
                ファイルの列を「{module.labels.moduleName}」のどの項目に取り込むか確認してください。
                列名から自動でマッピング済みです。
              </p>
              <div className="overflow-hidden rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr className="text-muted-foreground text-xs">
                      <th className="px-3 py-2 text-left font-semibold">ファイルの列</th>
                      <th className="px-3 py-2 text-left font-semibold">サンプル値</th>
                      <th className="w-52 px-3 py-2 text-left font-semibold">取り込み先</th>
                    </tr>
                  </thead>
                  <tbody>
                    {columns.map((col, idx) => {
                      const used = new Set(
                        Object.entries(mapping)
                          .filter(([k]) => Number(k) !== idx)
                          .map(([, v]) => v),
                      );
                      return (
                        <tr key={idx} className="border-t">
                          <td className="px-3 py-1.5 font-medium">{col.header}</td>
                          <td className="text-muted-foreground max-w-40 truncate px-3 py-1.5 text-xs">
                            {col.sampleValues.join('、 ')}
                          </td>
                          <td className="px-3 py-1.5">
                            <Select
                              value={mapping[idx] ?? SKIP_COLUMN}
                              onValueChange={(v) => setMapping({ ...mapping, [idx]: v })}
                            >
                              <SelectTrigger size="sm" className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {fields.map((f) => (
                                  <SelectItem
                                    key={f.key}
                                    value={f.key}
                                    disabled={used.has(f.key)}
                                  >
                                    {f.label}
                                    {f.required ? ' *' : ''}
                                  </SelectItem>
                                ))}
                                <SelectSeparator />
                                <SelectItem value={NEW_FIELD}>
                                  <span className="text-primary">＋ 新しい項目として追加</span>
                                </SelectItem>
                                <SelectItem value={SKIP_COLUMN}>
                                  <span className="text-muted-foreground">取り込まない</span>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-muted-foreground text-xs">
                {mappedCount}列をマッピング済み
                {newFieldCount > 0 && `、${newFieldCount}列を新規項目として追加`}
              </p>
            </div>
          )}

          {step === 2 && report && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-2">
                <IssueCard
                  label="必須項目の空欄"
                  count={report.rows.requiredEmpty.size}
                  color="text-rose-600"
                />
                <IssueCard
                  label="重複"
                  count={report.rows.duplicateInFile.size + report.rows.duplicateExisting.size}
                  color="text-amber-600"
                />
                <IssueCard label="異常値" count={report.rows.anomaly.size} color="text-orange-600" />
                <IssueCard label="空欄セル" count={report.emptyCellCount} color="text-muted-foreground" />
              </div>

              <div className="space-y-2 rounded-lg border p-3">
                <div className="text-sm font-semibold">取り込み時の扱い</div>
                <Label className="flex cursor-pointer items-center gap-2 text-sm font-normal">
                  <Checkbox
                    checked={skips.skipRequiredEmpty}
                    onCheckedChange={(v) => setSkips({ ...skips, skipRequiredEmpty: !!v })}
                  />
                  必須項目が空欄の行をスキップする
                </Label>
                <Label className="flex cursor-pointer items-center gap-2 text-sm font-normal">
                  <Checkbox
                    checked={skips.skipDuplicates}
                    onCheckedChange={(v) => setSkips({ ...skips, skipDuplicates: !!v })}
                  />
                  重複している行をスキップする
                </Label>
                <Label className="flex cursor-pointer items-center gap-2 text-sm font-normal">
                  <Checkbox
                    checked={skips.skipAnomalies}
                    onCheckedChange={(v) => setSkips({ ...skips, skipAnomalies: !!v })}
                  />
                  異常値を含む行をスキップする（オフ: そのまま取り込む）
                </Label>
              </div>

              {issueRows.size > 0 && (
                <div className="space-y-1">
                  <div className="text-sm font-semibold">検出された問題（先頭10件）</div>
                  <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border p-2">
                    {[...issueRows]
                      .sort((a, b) => a - b)
                      .slice(0, 10)
                      .map((rowIdx) => (
                        <div key={rowIdx} className="text-xs">
                          <span className="text-muted-foreground tabular mr-2">
                            {rowIdx + 2}行目
                          </span>
                          {(report.messages.get(rowIdx) ?? []).join(' / ')}
                        </div>
                      ))}
                  </div>
                </div>
              )}
              {issueRows.size === 0 && (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
                  <Check className="size-4" />
                  問題は見つかりませんでした。そのまま取り込めます。
                </div>
              )}
            </div>
          )}

          {step === 3 && summary && <SummaryCard summary={summary} />}
        </div>

        <div className="flex items-center justify-between border-t pt-3">
          {step > 0 && step < 3 ? (
            <Button variant="ghost" onClick={() => setStep(step - 1)}>
              <ArrowLeft className="size-4" />
              戻る
            </Button>
          ) : (
            <span />
          )}
          {step < 2 && (
            <Button onClick={() => setStep(step + 1)} disabled={step === 1 && mappedCount + newFieldCount === 0}>
              次へ
              <ArrowRight className="size-4" />
            </Button>
          )}
          {step === 2 && (
            <Button onClick={() => void doCommit()} disabled={committing}>
              {committing ? '取り込み中…' : 'この内容で取り込む'}
            </Button>
          )}
          {step === 3 && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={closeWizard}>
                閉じる
              </Button>
              <Button
                onClick={() => {
                  closeWizard();
                  navigate({ kind: 'module', moduleId, view: 'table' });
                }}
              >
                テーブルで確認する
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function IssueCard({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="rounded-lg border p-3 text-center">
      <div className={cn('tabular text-xl font-bold', count === 0 ? 'text-muted-foreground/40' : color)}>
        {count}
      </div>
      <div className="text-muted-foreground mt-0.5 text-[11px]">{label}</div>
    </div>
  );
}
