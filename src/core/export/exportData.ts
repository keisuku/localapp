import * as XLSX from 'xlsx';
import type { AppRecord } from '@/core/types/record';
import type { FieldDef, ModuleDefinition } from '@/core/types/module';
import { statusLabel, optionLabel } from '@/core/moduleUtils';
import {
  DIFF_STATUS_LABEL,
  type CompareMapping,
  type CompareRow,
} from '@/core/compare/buildComparison';

export type ExportFormat = 'xlsx' | 'csv' | 'json';

/** 表示中のレコードを Excel / CSV / JSON でダウンロードする */
export function exportRecords(
  module: ModuleDefinition,
  fields: FieldDef[],
  records: AppRecord[],
  format: ExportFormat,
): void {
  const stamp = dateStamp();
  const base = `${module.id}-${stamp}`;

  if (format === 'json') {
    const rows = records.map((r) => ({
      ...r.data,
      ステータス: statusLabel(module, r.status),
      タグ: r.tags.join(','),
      スコア: r.score,
    }));
    downloadBlob(
      new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' }),
      `${base}.json`,
    );
    return;
  }

  const headers = [...fields.map((f) => f.label), 'ステータス', 'タグ', 'スコア'];
  const matrix = records.map((r) => [
    ...fields.map((f) => exportCell(f, r.data[f.key], format)),
    statusLabel(module, r.status),
    r.tags.join(','),
    r.score ?? '',
  ]);
  const ws = XLSX.utils.aoa_to_sheet([headers, ...matrix]);

  if (format === 'xlsx') {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, module.labels.moduleName.slice(0, 31));
    XLSX.writeFile(wb, `${base}.xlsx`);
    return;
  }

  // CSV は Excel で文字化けしないよう UTF-8 BOM を付ける
  const csv = '﻿' + XLSX.utils.sheet_to_csv(ws);
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `${base}.csv`);
}

function exportCell(field: FieldDef, v: unknown, format: ExportFormat): unknown {
  if (v === null || v === undefined) return '';
  let out: unknown = v;
  if (field.type === 'select') out = optionLabel(field, v);
  else if (field.type === 'multiselect' && Array.isArray(v)) out = v.join(',');
  else if (field.type === 'boolean') out = v ? 'はい' : 'いいえ';
  // CSVインジェクション対策：数式に解釈されうる先頭文字をエスケープ
  if (format === 'csv' && typeof out === 'string' && /^[=+\-@\t]/.test(out)) {
    out = `'${out}`;
  }
  return out;
}

/** CSV インジェクション対策：数式に解釈されうる先頭文字をエスケープ */
function csvSafe(v: unknown, format: 'xlsx' | 'csv'): unknown {
  if (format === 'csv' && typeof v === 'string' && /^[=+\-@\t]/.test(v)) return `'${v}`;
  return v;
}

/** 比較結果（表示中＝差分のみ適用後の行）を Excel / CSV で出力する */
export function exportComparison(
  rows: CompareRow[],
  mapping: CompareMapping,
  labels: { before: string; after: string },
  format: 'xlsx' | 'csv',
): void {
  const headers = [
    mapping.keyHeader,
    ...mapping.categoryHeaders,
    labels.before,
    labels.after,
    '差分',
    '差分率(%)',
    '状態',
  ];
  const matrix = rows.map((r) => [
    csvSafe(r.keyValue, format),
    ...r.categoryValues.map((c) => csvSafe(c, format)),
    r.before ?? '',
    r.after ?? '',
    r.diff,
    r.diffPct === null ? '' : Math.round(r.diffPct * 10) / 10,
    DIFF_STATUS_LABEL[r.status],
  ]);
  const ws = XLSX.utils.aoa_to_sheet([headers, ...matrix]);
  const base = `compare-${dateStamp()}`;

  if (format === 'xlsx') {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '差分');
    XLSX.writeFile(wb, `${base}.xlsx`);
    return;
  }
  const csv = '﻿' + XLSX.utils.sheet_to_csv(ws);
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `${base}.csv`);
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export function dateStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}
