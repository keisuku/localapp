import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Download,
  FileSpreadsheet,
  FileText,
  Sparkles,
  TriangleAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Scale, Merge, GitCompareArrows } from 'lucide-react';
import { MergeTab, KeyDiffTab } from './dataTools';
import { FileDropSlot } from './FileDropSlot';
import { sampleActualTable, sampleBudgetTable } from './sampleTables';
import type { ParsedTable } from '@/core/types/import';
import {
  buildComparison,
  DIFF_STATUS_LABEL,
  type CompareMapping,
  type CompareRow,
  type DiffStatus,
} from '@/core/compare/buildComparison';
import { inferColumns } from '@/core/import/inferColumns';
import { exportComparison } from '@/core/export/exportData';
import { useSettingValue } from '@/core/db/queries';
import { setSetting } from '@/core/db/db';
import { formatCurrency } from '@/core/utils/format';
import { cn } from '@/core/utils/cn';
import { toast } from 'sonner';

const MAPPING_KEY = 'compareMapping';
const STATUS_COLOR: Record<DiffStatus, string> = {
  added: '#3b82f6',
  removed: '#94a3b8',
  changed: '#f59e0b',
  same: '#94a3b8',
};

function commonHeaders(a: ParsedTable, b: ParsedTable): string[] {
  const bset = new Set(b.headers);
  return a.headers.filter((h) => bset.has(h));
}

/** 両表から、キー・金額・区分列の妥当な初期値を推定する */
function guessMapping(
  before: ParsedTable,
  after: ParsedTable,
  persisted: CompareMapping | undefined,
): CompareMapping {
  const common = commonHeaders(before, after);
  if (
    persisted &&
    common.includes(persisted.keyHeader) &&
    common.includes(persisted.amountHeader)
  ) {
    return {
      keyHeader: persisted.keyHeader,
      amountHeader: persisted.amountHeader,
      categoryHeaders: persisted.categoryHeaders.filter((h) => common.includes(h)),
    };
  }
  const typeByHeader = new Map(inferColumns(after).map((g) => [g.header, g.guessedType]));
  const isAmount = (h: string) =>
    typeByHeader.get(h) === 'currency' || typeByHeader.get(h) === 'number';
  const isLabel = (h: string) =>
    typeByHeader.get(h) === 'text' || typeByHeader.get(h) === 'select';

  const amountHeader = common.find(isAmount) ?? common[common.length - 1] ?? '';
  const keyHeader =
    common.find((h) => h !== amountHeader && isLabel(h)) ??
    common.find((h) => h !== amountHeader) ??
    common[0] ??
    '';
  const categoryHeaders = common
    .filter((h) => h !== amountHeader && h !== keyHeader && isLabel(h))
    .slice(0, 3);
  return { keyHeader, categoryHeaders, amountHeader };
}

function DiffStatusChip({ status }: { status: DiffStatus }) {
  const color = STATUS_COLOR[status];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap"
      style={{
        borderColor: `color-mix(in srgb, ${color} 35%, transparent)`,
        backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
      }}
    >
      <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
      {DIFF_STATUS_LABEL[status]}
    </span>
  );
}

function StepBadge({ n, active, done }: { n: number; active: boolean; done: boolean }) {
  return (
    <span
      className={cn(
        'flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors',
        active || done
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-muted-foreground',
      )}
    >
      {n}
    </span>
  );
}

function Money({ value, strong }: { value: number | null; strong?: boolean }) {
  if (value === null) return <span className="text-muted-foreground">—</span>;
  return <span className={cn('tabular', strong && 'font-semibold')}>{formatCurrency(value)}</span>;
}

/**
 * 「2つのファイルを突き合わせる」操作を1か所に集約した画面。
 * - 予実・金額差分：キー＋区分で金額を集計し、前回/今回の差分を出す
 * - 名寄せ・一括更新：基準＋更新ファイルをキー突合
 * - キー差分比較：セル/列単位の追加・削除・変更を一覧化
 */
export function ComparePage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-5 p-5">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">予実・差分ツール</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            2つのExcel / CSVをブラウザ内だけで突き合わせ、差分・名寄せの結果をExcelに出力します。
          </p>
        </div>
        <Tabs defaultValue="budget">
          <TabsList>
            <TabsTrigger value="budget">
              <Scale className="size-4" />
              予実・金額差分
            </TabsTrigger>
            <TabsTrigger value="merge">
              <Merge className="size-4" />
              名寄せ・一括更新
            </TabsTrigger>
            <TabsTrigger value="keydiff">
              <GitCompareArrows className="size-4" />
              キー差分比較
            </TabsTrigger>
          </TabsList>
          <TabsContent value="budget" className="mt-4">
            <BudgetActualTab />
          </TabsContent>
          <TabsContent value="merge" className="mt-4">
            <MergeTab />
          </TabsContent>
          <TabsContent value="keydiff" className="mt-4">
            <KeyDiffTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function BudgetActualTab() {
  const [before, setBefore] = useState<ParsedTable | null>(null);
  const [after, setAfter] = useState<ParsedTable | null>(null);
  const [mapping, setMapping] = useState<CompareMapping | null>(null);
  const [changedOnly, setChangedOnly] = useState(true);
  const persisted = useSettingValue<CompareMapping>(MAPPING_KEY);

  // 両ファイルが揃ったら列マッピングを推定（保存値があれば優先）
  useEffect(() => {
    if (before && after) setMapping((m) => m ?? guessMapping(before, after, persisted));
    if (!before || !after) setMapping(null);
  }, [before, after, persisted]);

  const common = before && after ? commonHeaders(before, after) : [];
  const bothLoaded = !!before && !!after;
  const mappingReady = !!mapping && !!mapping.keyHeader && !!mapping.amountHeader;

  const result = useMemo(() => {
    if (!before || !after || !mappingReady || !mapping) return null;
    return buildComparison(before, after, mapping);
  }, [before, after, mapping, mappingReady]);

  const visibleRows = useMemo(() => {
    if (!result) return [];
    return changedOnly ? result.rows.filter((r) => r.status !== 'same') : result.rows;
  }, [result, changedOnly]);

  const step = !bothLoaded ? 1 : !mappingReady ? 2 : 3;

  const updateMapping = (patch: Partial<CompareMapping>) => {
    setMapping((m) => {
      const next = { ...(m ?? { keyHeader: '', categoryHeaders: [], amountHeader: '' }), ...patch };
      void setSetting(MAPPING_KEY, next);
      return next;
    });
  };

  const loadSamples = () => {
    setBefore(sampleBudgetTable());
    setAfter(sampleActualTable());
    setMapping(null);
    toast.success('サンプルの予算/実績を読み込みました');
  };

  const doExport = (format: 'xlsx' | 'csv') => {
    if (!mapping || visibleRows.length === 0) {
      toast.info('出力対象の差分がありません');
      return;
    }
    exportComparison(visibleRows, mapping, { before: '前回', after: '今回' }, format);
    toast.success(`${visibleRows.length}件を${format.toUpperCase()}に出力しました`);
  };

  return (
    <div className="space-y-5">
      {/* 説明＋ステップ：次に何をすればいいかが一目で分かる */}
      <div className="space-y-1">
          <p className="text-muted-foreground text-sm leading-relaxed">
            2つのExcelを入れるだけで、<b>増えた・減った・変わった</b>金額が出ます。前回／今回（予算／実績）を突き合わせ、差分だけをExcelに出力できます。
          </p>
          {/* ステップ表示：次に何をすればいいかが一目で分かる */}
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 pt-1 text-sm">
            <span className={cn('flex items-center gap-1.5', step === 1 && 'text-foreground font-medium')}>
              <StepBadge n={1} active={step === 1} done={step > 1} />
              ファイルを2つ入れる
            </span>
            <span className="text-muted-foreground/50">→</span>
            <span className={cn('flex items-center gap-1.5', step === 2 && 'text-foreground font-medium')}>
              <StepBadge n={2} active={step === 2} done={step > 2} />
              列を選ぶ
            </span>
            <span className="text-muted-foreground/50">→</span>
            <span className={cn('flex items-center gap-1.5', step === 3 && 'text-foreground font-medium')}>
              <StepBadge n={3} active={step === 3} done={false} />
              差分を確認・出力
            </span>
          </div>
        </div>

        {/* ① ファイル投入 */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FileDropSlot badge="1" title="前回（予算）ファイル" table={before} onLoaded={setBefore} />
          <FileDropSlot badge="2" title="今回（実績）ファイル" table={after} onLoaded={setAfter} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={loadSamples}>
            <Sparkles className="size-4" />
            サンプルで試す
          </Button>
          {(before || after) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setBefore(null);
                setAfter(null);
                setMapping(null);
              }}
            >
              クリア
            </Button>
          )}
        </div>

        {/* ② 列マッピング */}
        {bothLoaded && common.length === 0 && (
          <div className="border-destructive/40 bg-destructive/5 text-destructive flex items-start gap-2 rounded-lg border p-3 text-sm">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <div>
              2つのファイルに<b>共通の列見出し</b>がありません。前回・今回で同じ見出し（例: 顧客名・部門・金額）になっているか確認してください。
            </div>
          </div>
        )}
        {bothLoaded && common.length > 0 && mapping && (
          <div className="bg-card space-y-3 rounded-xl border p-4 shadow-xs">
            <div className="text-sm font-semibold">② 突き合わせる列を選ぶ</div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="space-y-1.5">
                <span className="text-muted-foreground text-xs font-medium">キー列（顧客名など）</span>
                <Select value={mapping.keyHeader} onValueChange={(v) => updateMapping({ keyHeader: v })}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="選択…" />
                  </SelectTrigger>
                  <SelectContent>
                    {common.map((h) => (
                      <SelectItem key={h} value={h}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="space-y-1.5">
                <span className="text-muted-foreground text-xs font-medium">金額列</span>
                <Select
                  value={mapping.amountHeader}
                  onValueChange={(v) => updateMapping({ amountHeader: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="選択…" />
                  </SelectTrigger>
                  <SelectContent>
                    {common.map((h) => (
                      <SelectItem key={h} value={h}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <div className="space-y-1.5">
                <span className="text-muted-foreground text-xs font-medium">区分列（任意・複数可）</span>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {common
                    .filter((h) => h !== mapping.keyHeader && h !== mapping.amountHeader)
                    .map((h) => {
                      const on = mapping.categoryHeaders.includes(h);
                      return (
                        <button
                          key={h}
                          onClick={() =>
                            updateMapping({
                              categoryHeaders: on
                                ? mapping.categoryHeaders.filter((x) => x !== h)
                                : [...mapping.categoryHeaders, h],
                            })
                          }
                          className={cn(
                            'rounded-full border px-2.5 py-1 text-xs transition-colors',
                            on
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'hover:bg-accent',
                          )}
                        >
                          {h}
                        </button>
                      );
                    })}
                  {common.filter((h) => h !== mapping.keyHeader && h !== mapping.amountHeader)
                    .length === 0 && (
                    <span className="text-muted-foreground text-xs">（他の列なし）</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ③ 結果 */}
        {result && (
          <div className="space-y-3">
            {/* サマリー */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SummaryCard label="前回 合計" value={formatCurrency(result.totals.before)} />
              <SummaryCard label="今回 合計" value={formatCurrency(result.totals.after)} />
              <SummaryCard
                label="差分"
                value={`${result.totals.diff >= 0 ? '+' : ''}${formatCurrency(result.totals.diff)}`}
                accent={result.totals.diff > 0 ? 'up' : result.totals.diff < 0 ? 'down' : undefined}
              />
              <SummaryCard
                label="新規 / 削除 / 変更"
                value={`${result.totals.added} / ${result.totals.removed} / ${result.totals.changed}`}
              />
            </div>

            {/* ツールバー */}
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={changedOnly}
                  onCheckedChange={(v) => setChangedOnly(v === true)}
                />
                差分だけ表示（同一を隠す）
              </label>
              <span className="text-muted-foreground text-sm">
                表示 {visibleRows.length} 件 / 全 {result.rows.length} 件
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="ml-auto">
                    <Download className="size-4" />
                    差分をExcel出力
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => doExport('xlsx')}>
                    <FileSpreadsheet className="size-4" />
                    Excel（.xlsx）
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => doExport('csv')}>
                    <FileText className="size-4" />
                    CSV（UTF-8 BOM付き）
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* 対比表 */}
            <div className="bg-card overflow-x-auto rounded-xl border shadow-xs">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground text-xs">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">{mapping?.keyHeader}</th>
                    {mapping?.categoryHeaders.map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-medium">
                        {h}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-right font-medium">前回</th>
                    <th className="px-3 py-2 text-right font-medium">今回</th>
                    <th className="px-3 py-2 text-right font-medium">差分</th>
                    <th className="px-3 py-2 text-right font-medium">差分率</th>
                    <th className="px-3 py-2 text-center font-medium">状態</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((r) => (
                    <CompareTableRow key={r.groupId} row={r} categoryCount={mapping?.categoryHeaders.length ?? 0} />
                  ))}
                  {visibleRows.length === 0 && (
                    <tr>
                      <td
                        colSpan={4 + (mapping?.categoryHeaders.length ?? 0)}
                        className="text-muted-foreground px-3 py-8 text-center"
                      >
                        差分はありませんでした（前回と今回は一致しています）。
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: 'up' | 'down';
}) {
  return (
    <div className="bg-card rounded-xl border p-3 shadow-xs">
      <div className="text-muted-foreground text-xs">{label}</div>
      <div
        className={cn(
          'tabular mt-1 text-base font-semibold',
          accent === 'up' && 'text-emerald-600 dark:text-emerald-400',
          accent === 'down' && 'text-rose-600 dark:text-rose-400',
        )}
      >
        {value}
      </div>
    </div>
  );
}

function CompareTableRow({ row, categoryCount }: { row: CompareRow; categoryCount: number }) {
  const up = row.diff > 0;
  const down = row.diff < 0;
  return (
    <tr className="hover:bg-accent/40 border-t transition-colors">
      <td className="px-3 py-2 font-medium">{row.keyValue || '—'}</td>
      {Array.from({ length: categoryCount }, (_, i) => (
        <td key={i} className="text-muted-foreground px-3 py-2">
          {row.categoryValues[i] || '—'}
        </td>
      ))}
      <td className="px-3 py-2 text-right">
        <Money value={row.before} />
      </td>
      <td className="px-3 py-2 text-right">
        <Money value={row.after} />
      </td>
      <td
        className={cn(
          'tabular px-3 py-2 text-right font-medium',
          up && 'text-emerald-600 dark:text-emerald-400',
          down && 'text-rose-600 dark:text-rose-400',
        )}
      >
        <span className="inline-flex items-center justify-end gap-0.5">
          {up && <ArrowUpRight className="size-3.5" />}
          {down && <ArrowDownRight className="size-3.5" />}
          {row.diff >= 0 ? '+' : ''}
          {formatCurrency(row.diff)}
        </span>
      </td>
      <td className="tabular text-muted-foreground px-3 py-2 text-right">
        {row.diffPct === null ? '—' : `${row.diffPct >= 0 ? '+' : ''}${row.diffPct.toFixed(1)}%`}
      </td>
      <td className="px-3 py-2 text-center">
        <DiffStatusChip status={row.status} />
      </td>
    </tr>
  );
}
