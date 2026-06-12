import * as XLSX from 'xlsx';
import type { BackupData, ParseResult, ParsedTable } from '@/core/types/import';

/**
 * File → 表データ or バックアップ。
 * - .xlsx … SheetJS（複数シートは先頭を採用、シート名一覧を保持）
 * - .csv  … UTF-8 厳格デコード → 失敗時 Shift_JIS フォールバック
 * - .json … レコード配列 or バックアップ形式を自動判別
 */
export async function parseFile(file: File): Promise<ParseResult> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.json')) return parseJson(await file.text(), file.name);
  if (name.endsWith('.csv') || name.endsWith('.tsv') || name.endsWith('.txt')) {
    return { kind: 'table', table: parseCsv(await file.arrayBuffer(), file.name) };
  }
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    return { kind: 'table', table: parseXlsx(await file.arrayBuffer(), file.name) };
  }
  throw new Error(`未対応のファイル形式です: ${file.name}（.xlsx / .csv / .json に対応）`);
}

export function isBackupShape(obj: unknown): obj is BackupData {
  return (
    !!obj &&
    typeof obj === 'object' &&
    'version' in obj &&
    'records' in obj &&
    Array.isArray((obj as BackupData).records)
  );
}

function parseJson(text: string, fileName: string): ParseResult {
  let obj: unknown;
  try {
    obj = JSON.parse(text);
  } catch {
    throw new Error('JSONの解析に失敗しました。ファイルが壊れていないか確認してください。');
  }
  if (isBackupShape(obj)) {
    return { kind: 'backup', backup: obj };
  }
  if (Array.isArray(obj) && obj.length > 0 && typeof obj[0] === 'object' && obj[0] !== null) {
    const rows = obj as Record<string, unknown>[];
    const headers = Array.from(
      rows.reduce<Set<string>>((set, row) => {
        for (const k of Object.keys(row)) {
          if (k !== '__proto__' && k !== 'constructor' && k !== 'prototype') set.add(k);
        }
        return set;
      }, new Set()),
    );
    return {
      kind: 'table',
      table: {
        headers,
        rows: rows.map((r) => headers.map((h) => r[h] ?? null)),
        sourceName: fileName,
        fileType: 'json',
      },
    };
  }
  throw new Error('対応していないJSON形式です（オブジェクトの配列、またはバックアップファイル）。');
}

function parseCsv(buf: ArrayBuffer, fileName: string): ParsedTable {
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch {
    // Excel が出力する日本語 CSV は Shift_JIS のことが多い
    text = new TextDecoder('shift_jis').decode(buf);
  }
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const wb = XLSX.read(text, { type: 'string', raw: true });
  return workbookToTable(wb, fileName, 'csv');
}

function parseXlsx(buf: ArrayBuffer, fileName: string): ParsedTable {
  const wb = XLSX.read(buf, { type: 'array', cellDates: true });
  return workbookToTable(wb, fileName, 'xlsx');
}

/** クリップボードからの貼り付け（Excel のセル範囲は TSV で渡ってくる） */
export function parseClipboardText(text: string): ParsedTable | null {
  const trimmed = text.replace(/\n+$/, '');
  if (!trimmed.includes('\t') || !trimmed.includes('\n')) return null;
  const wb = XLSX.read(trimmed, { type: 'string', raw: true, FS: '\t' });
  const table = workbookToTable(wb, 'クリップボード', 'clipboard');
  return table.rows.length > 0 ? table : null;
}

function workbookToTable(
  wb: XLSX.WorkBook,
  sourceName: string,
  fileType: ParsedTable['fileType'],
  sheetName?: string,
): ParsedTable {
  const active = sheetName ?? wb.SheetNames[0];
  const ws = wb.Sheets[active];
  if (!ws) throw new Error('シートが見つかりませんでした。');
  const matrix: unknown[][] = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    raw: true,
    defval: null,
  });
  // 先頭の完全空行を除去し、最初の非空行をヘッダーとする
  const nonEmpty = matrix.filter((row) => row.some((c) => c !== null && c !== ''));
  if (nonEmpty.length === 0) throw new Error('データが空です。');
  const headers = nonEmpty[0].map((h, i) =>
    h === null || h === '' ? `列${i + 1}` : String(h).trim(),
  );
  const rows = nonEmpty.slice(1).map((row) => {
    const out = new Array<unknown>(headers.length);
    for (let i = 0; i < headers.length; i++) {
      const v = row[i] ?? null;
      out[i] = v instanceof Date ? v : v;
    }
    return out;
  });
  return {
    headers,
    rows,
    sourceName,
    fileType,
    sheetNames: wb.SheetNames.length > 1 ? wb.SheetNames : undefined,
    activeSheet: wb.SheetNames.length > 1 ? active : undefined,
  };
}

/** 複数シートの xlsx で別シートを選び直す */
export async function reparseSheet(file: File, sheetName: string): Promise<ParsedTable> {
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
  return workbookToTable(wb, file.name, 'xlsx', sheetName);
}
