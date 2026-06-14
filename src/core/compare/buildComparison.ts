import type { ParsedTable } from '@/core/types/import';
import { toNumber } from '@/core/utils/format';

/**
 * 2つの表（前回/今回・予算/実績）を、キー列＋区分列で集計して突き合わせる純粋ロジック。
 * UI・ファイル I/O から独立しており、副作用を持たない。
 */

export interface CompareMapping {
  /** キー列のヘッダ名（例: 顧客名） */
  keyHeader: string;
  /** 追加の区分列ヘッダ（0〜3個。例: 部門・時期） */
  categoryHeaders: string[];
  /** 金額列のヘッダ名 */
  amountHeader: string;
}

/** added=新規 / removed=削除 / changed=変更 / same=同一 */
export type DiffStatus = 'added' | 'removed' | 'changed' | 'same';

export interface CompareRow {
  /** キー＋区分を結合した一意キー */
  groupId: string;
  keyValue: string;
  categoryValues: string[];
  /** 前回側の金額合計。null = 前回に存在せず */
  before: number | null;
  /** 今回側の金額合計。null = 今回に存在せず */
  after: number | null;
  /** (after ?? 0) - (before ?? 0) */
  diff: number;
  /** 前回比(%)。前回が 0 / null のときは null */
  diffPct: number | null;
  status: DiffStatus;
}

export interface CompareTotals {
  before: number;
  after: number;
  diff: number;
  added: number;
  removed: number;
  changed: number;
  same: number;
}

export interface CompareResult {
  rows: CompareRow[];
  totals: CompareTotals;
}

interface Group {
  keyValue: string;
  categoryValues: string[];
  /** 集計対象の行が1つでもあったか（金額が空でも存在は記録する） */
  present: boolean;
  sum: number;
}

function cell(value: unknown): string {
  return value === null || value === undefined ? '' : String(value).trim();
}

/** 1つの表をキー＋区分でグループ化し、金額を合計する */
function aggregate(table: ParsedTable, mapping: CompareMapping): Map<string, Group> {
  const keyIdx = table.headers.indexOf(mapping.keyHeader);
  const catIdx = mapping.categoryHeaders.map((h) => table.headers.indexOf(h));
  const amountIdx = table.headers.indexOf(mapping.amountHeader);

  const groups = new Map<string, Group>();
  if (keyIdx < 0 || amountIdx < 0) return groups;

  for (const row of table.rows) {
    const keyValue = cell(row[keyIdx]);
    const categoryValues = catIdx.map((i) => (i >= 0 ? cell(row[i]) : ''));
    // キーが空の行は集計対象外（合計やキー無しノイズを避ける）
    if (keyValue === '' && categoryValues.every((c) => c === '')) continue;

    const groupId = [keyValue, ...categoryValues].join(' / ');
    const existing = groups.get(groupId);
    const amount = toNumber(row[amountIdx]) ?? 0;
    if (existing) {
      existing.sum += amount;
      existing.present = true;
    } else {
      groups.set(groupId, { keyValue, categoryValues, present: true, sum: amount });
    }
  }
  return groups;
}

function classify(before: number | null, after: number | null): DiffStatus {
  if (before === null && after !== null) return 'added';
  if (before !== null && after === null) return 'removed';
  return (after ?? 0) - (before ?? 0) === 0 ? 'same' : 'changed';
}

export function buildComparison(
  before: ParsedTable,
  after: ParsedTable,
  mapping: CompareMapping,
): CompareResult {
  const beforeGroups = aggregate(before, mapping);
  const afterGroups = aggregate(after, mapping);

  const ids = new Set<string>([...beforeGroups.keys(), ...afterGroups.keys()]);
  const rows: CompareRow[] = [];
  const totals: CompareTotals = {
    before: 0,
    after: 0,
    diff: 0,
    added: 0,
    removed: 0,
    changed: 0,
    same: 0,
  };

  for (const id of ids) {
    const b = beforeGroups.get(id);
    const a = afterGroups.get(id);
    const beforeVal = b ? b.sum : null;
    const afterVal = a ? a.sum : null;
    const diff = (afterVal ?? 0) - (beforeVal ?? 0);
    const diffPct = beforeVal && beforeVal !== 0 ? (diff / Math.abs(beforeVal)) * 100 : null;
    const status = classify(beforeVal, afterVal);

    rows.push({
      groupId: id,
      keyValue: (a ?? b)!.keyValue,
      categoryValues: (a ?? b)!.categoryValues,
      before: beforeVal,
      after: afterVal,
      diff,
      diffPct,
      status,
    });

    totals.before += beforeVal ?? 0;
    totals.after += afterVal ?? 0;
    totals[status] += 1;
  }
  totals.diff = totals.after - totals.before;

  // 差分の大きい順 → キー名順で安定ソート（注目すべき行を上に）
  rows.sort((x, y) => {
    const d = Math.abs(y.diff) - Math.abs(x.diff);
    if (d !== 0) return d;
    return x.groupId.localeCompare(y.groupId, 'ja');
  });

  return { rows, totals };
}

export const DIFF_STATUS_LABEL: Record<DiffStatus, string> = {
  added: '新規',
  removed: '削除',
  changed: '変更',
  same: '同一',
};
