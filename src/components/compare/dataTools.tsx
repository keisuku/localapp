import { useMemo, useState } from 'react';
import { Upload, Download, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { parseFile } from '@/core/import/parseFile';
import { dateStamp } from '@/core/export/exportData';
import type { ParsedTable } from '@/core/types/import';

/**
 * 「業務データ工房」由来の汎用ツール（名寄せ・一括更新／キー差分比較）。
 * 予実・差分ツール画面のタブとして同居させ、「2ファイルを突き合わせる」操作を1か所に集約する。
 */

type DiffKind = '追加' | '削除' | '変更';
interface DiffRow {
  kind: DiffKind;
  key: string;
  column: string;
  before: string;
  after: string;
}

function tableToObjects(table: ParsedTable): Record<string, unknown>[] {
  return table.rows.map((row) => Object.fromEntries(table.headers.map((h, i) => [h, row[i] ?? ''])));
}
function norm(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).trim();
}
async function loadTable(file: File): Promise<ParsedTable> {
  const result = await parseFile(file);
  if (result.kind !== 'table') throw new Error('表形式のファイルを選択してください。');
  return result.table;
}
function exportRows(rows: Record<string, unknown>[], name: string) {
  const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ メッセージ: '出力対象がありません' }]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'result');
  XLSX.writeFile(wb, `${name}-${dateStamp()}.xlsx`);
}

async function pick(file: File | undefined, setter: (t: ParsedTable) => void) {
  if (!file) return;
  try {
    setter(await loadTable(file));
    toast.success(`${file.name} を読み込みました`);
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '読み込みに失敗しました');
  }
}

/** 名寄せ・一括更新タブ */
export function MergeTab() {
  const [base, setBase] = useState<ParsedTable | null>(null);
  const [update, setUpdate] = useState<ParsedTable | null>(null);
  const [mergeKey, setMergeKey] = useState('');
  const [mergedRows, setMergedRows] = useState<Record<string, unknown>[]>([]);

  const mergeKeys = useMemo(
    () => (base && update ? base.headers.filter((h) => update.headers.includes(h)) : []),
    [base, update],
  );

  function runMerge() {
    if (!base || !update || !mergeKey) return;
    const updateMap = new Map(tableToObjects(update).map((r) => [norm(r[mergeKey]), r]));
    const rows = tableToObjects(base).map((row) => {
      const patch = updateMap.get(norm(row[mergeKey]));
      return patch
        ? { ...row, ...Object.fromEntries(Object.entries(patch).filter(([, v]) => norm(v) !== '')) }
        : row;
    });
    const baseKeys = new Set(rows.map((r) => norm(r[mergeKey])));
    for (const row of tableToObjects(update)) if (!baseKeys.has(norm(row[mergeKey]))) rows.push(row);
    setMergedRows(rows);
    toast.success(`${rows.length}件の名寄せ結果を作成しました`);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>顧客リストの名寄せ・一括更新</CardTitle>
        <CardDescription>
          基準リストに追加ファイルをキー列で突合し、空でない更新値を反映。新規キーは末尾に追加します。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FilePicker label="基準リスト" table={base} onFile={(f) => void pick(f, setBase)} />
        <FilePicker label="更新ファイル" table={update} onFile={(f) => void pick(f, setUpdate)} />
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label>キー列</Label>
            <Select value={mergeKey} onValueChange={setMergeKey}>
              <SelectTrigger className="w-60">
                <SelectValue placeholder="共通列を選択" />
              </SelectTrigger>
              <SelectContent>
                {mergeKeys.map((h) => (
                  <SelectItem key={h} value={h}>
                    {h}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={runMerge} disabled={!base || !update || !mergeKey}>
            名寄せを実行
          </Button>
          <Button
            variant="outline"
            onClick={() => exportRows(mergedRows, 'merged-customers')}
            disabled={!mergedRows.length}
          >
            <Download className="size-4" />
            Excel出力
          </Button>
        </div>
        <Preview rows={mergedRows} />
      </CardContent>
    </Card>
  );
}

/** キー差分比較タブ（セル/列単位の差分一覧） */
export function KeyDiffTab() {
  const [left, setLeft] = useState<ParsedTable | null>(null);
  const [right, setRight] = useState<ParsedTable | null>(null);
  const [diffKey, setDiffKey] = useState('');
  const [diffRows, setDiffRows] = useState<DiffRow[]>([]);

  const diffKeys = useMemo(
    () => (left && right ? left.headers.filter((h) => right.headers.includes(h)) : []),
    [left, right],
  );

  function runDiff() {
    if (!left || !right || !diffKey) return;
    const a = new Map(tableToObjects(left).map((r) => [norm(r[diffKey]), r]));
    const b = new Map(tableToObjects(right).map((r) => [norm(r[diffKey]), r]));
    const cols = Array.from(new Set([...left.headers, ...right.headers])).filter((h) => h !== diffKey);
    const out: DiffRow[] = [];
    for (const [key, row] of a) {
      const next = b.get(key);
      if (!next) out.push({ kind: '削除', key, column: '', before: 'あり', after: 'なし' });
      else
        for (const c of cols)
          if (norm(row[c]) !== norm(next[c]))
            out.push({ kind: '変更', key, column: c, before: norm(row[c]), after: norm(next[c]) });
    }
    for (const [key] of b) if (!a.has(key)) out.push({ kind: '追加', key, column: '', before: 'なし', after: 'あり' });
    setDiffRows(out);
    toast.success(`${out.length}件の差分を検出しました`);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>2つの表の差分一覧</CardTitle>
        <CardDescription>
          同じキー列を持つ2ファイルを比較し、追加・削除・値変更を一覧化します。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FilePicker label="比較元" table={left} onFile={(f) => void pick(f, setLeft)} />
        <FilePicker label="比較先" table={right} onFile={(f) => void pick(f, setRight)} />
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label>キー列</Label>
            <Select value={diffKey} onValueChange={setDiffKey}>
              <SelectTrigger className="w-60">
                <SelectValue placeholder="共通列を選択" />
              </SelectTrigger>
              <SelectContent>
                {diffKeys.map((h) => (
                  <SelectItem key={h} value={h}>
                    {h}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={runDiff} disabled={!left || !right || !diffKey}>
            差分を抽出
          </Button>
          <Button
            variant="outline"
            onClick={() => exportRows(diffRows.map((r) => ({ ...r })), 'table-diff')}
            disabled={!diffRows.length}
          >
            <Download className="size-4" />
            Excel出力
          </Button>
        </div>
        <DiffPreview rows={diffRows} />
      </CardContent>
    </Card>
  );
}

function FilePicker({
  label,
  table,
  onFile,
}: {
  label: string;
  table: ParsedTable | null;
  onFile: (file?: File) => void;
}) {
  return (
    <div className="bg-card flex flex-wrap items-center gap-3 rounded-lg border p-3">
      <FileSpreadsheet className="text-muted-foreground size-5" />
      <div className="min-w-40 flex-1">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-muted-foreground text-xs">
          {table
            ? `${table.sourceName} / ${table.rows.length}行 / ${table.headers.length}列`
            : 'xlsx・csv・jsonを選択'}
        </div>
      </div>
      <Label className="cursor-pointer">
        <Input
          className="hidden"
          type="file"
          accept=".xlsx,.xls,.csv,.tsv,.txt,.json"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <span className="border-input bg-card hover:bg-accent inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm shadow-xs">
          <Upload className="size-4" />
          選択
        </span>
      </Label>
    </div>
  );
}

function Preview({ rows }: { rows: Record<string, unknown>[] }) {
  const headers = Object.keys(rows[0] ?? {}).slice(0, 8);
  if (!rows.length) return null;
  return (
    <div className="overflow-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((h) => (
              <TableHead key={h}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.slice(0, 8).map((r, i) => (
            <TableRow key={i}>
              {headers.map((h) => (
                <TableCell key={h}>{norm(r[h])}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function DiffPreview({ rows }: { rows: DiffRow[] }) {
  if (!rows.length) return null;
  return (
    <div className="overflow-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>種別</TableHead>
            <TableHead>キー</TableHead>
            <TableHead>列</TableHead>
            <TableHead>比較元</TableHead>
            <TableHead>比較先</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.slice(0, 50).map((r, i) => (
            <TableRow key={i}>
              <TableCell>
                <Badge variant="outline">{r.kind}</Badge>
              </TableCell>
              <TableCell>{r.key}</TableCell>
              <TableCell>{r.column}</TableCell>
              <TableCell>{r.before}</TableCell>
              <TableCell>{r.after}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
