import type { ParsedTable } from '@/core/types/import';

/**
 * 「サンプルで試す」用の内蔵デモ。
 * 予算（前回）と実績（今回）の2表。一致／変更／予算のみ（=実績未達・削除扱い）／
 * 実績のみ（=予算外・新規扱い）が混ざるように作ってあり、差分表が一目で映える。
 */

const HEADERS = ['顧客名', '部門', '金額'];

const budgetRows: unknown[][] = [
  ['アルファ商事', '営業1部', 1200000],
  ['アルファ商事', '営業2部', 800000],
  ['ベータ工業', '営業1部', 1500000],
  ['ガンマ物産', '営業3部', 600000],
  ['デルタ建設', '営業2部', 2000000],
  ['イプシロン食品', '営業1部', 450000],
];

const actualRows: unknown[][] = [
  ['アルファ商事', '営業1部', 1350000], // 変更（+150,000）
  ['アルファ商事', '営業2部', 800000], // 同一
  ['ベータ工業', '営業1部', 1200000], // 変更（-300,000）
  ['ガンマ物産', '営業3部', 600000], // 同一
  // デルタ建設 営業2部 … 実績なし → 削除
  ['イプシロン食品', '営業1部', 520000], // 変更（+70,000）
  ['ゼータ通商', '営業3部', 900000], // 実績のみ → 新規
];

export function sampleBudgetTable(): ParsedTable {
  return { headers: HEADERS, rows: budgetRows, sourceName: '予算サンプル.xlsx', fileType: 'xlsx' };
}

export function sampleActualTable(): ParsedTable {
  return { headers: HEADERS, rows: actualRows, sourceName: '実績サンプル.xlsx', fileType: 'xlsx' };
}
