import type { AppRecord, FilterCondition } from '@/core/types/record';
import type { FieldDef } from '@/core/types/module';
import { toNumber } from '@/core/utils/format';

/** フリーテキスト検索：data の全値・タグ・ステータスを対象にする */
export function searchMatch(record: AppRecord, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const terms = q.split(/\s+/);
  const haystack = [
    ...Object.values(record.data).map((v) => (v == null ? '' : String(v))),
    ...record.tags,
    record.status,
  ]
    .join(' ')
    .toLowerCase();
  return terms.every((t) => haystack.includes(t));
}

export function evaluateCondition(record: AppRecord, cond: FilterCondition): boolean {
  let raw: unknown;
  if (cond.fieldKey === '$status') raw = record.status;
  else if (cond.fieldKey === '$tags') raw = record.tags.join(' ');
  else if (cond.fieldKey === '$score') raw = record.score;
  else raw = record.data[cond.fieldKey];

  const sv = raw == null ? '' : String(raw);
  const value = cond.value ?? '';

  switch (cond.op) {
    case 'empty':
      return sv.trim() === '';
    case 'notEmpty':
      return sv.trim() !== '';
    case 'contains':
      return sv.toLowerCase().includes(value.toLowerCase());
    case 'equals':
      return sv === value || sv.toLowerCase() === value.toLowerCase();
    case 'notEquals':
      return sv !== value && sv.toLowerCase() !== value.toLowerCase();
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte': {
      let a = toNumber(raw);
      let b = toNumber(value);
      if (a === null || b === null) {
        // 日付（YYYY-MM-DD）は数値化できないためタイムスタンプで比較する
        const ad = Date.parse(sv);
        const bd = Date.parse(value);
        if (Number.isNaN(ad) || Number.isNaN(bd)) return false;
        a = ad;
        b = bd;
      }
      if (cond.op === 'gt') return a > b;
      if (cond.op === 'gte') return a >= b;
      if (cond.op === 'lt') return a < b;
      return a <= b;
    }
  }
}

export function filterRecords(
  records: AppRecord[],
  search: string,
  conditions: FilterCondition[],
): AppRecord[] {
  return records.filter(
    (r) => searchMatch(r, search) && conditions.every((c) => evaluateCondition(r, c)),
  );
}

export const OP_LABELS: Record<FilterCondition['op'], string> = {
  contains: '含む',
  equals: '等しい',
  notEquals: '等しくない',
  gt: 'より大きい',
  gte: '以上',
  lt: 'より小さい',
  lte: '以下',
  empty: '空欄',
  notEmpty: '空欄でない',
};

export function opsForField(field: FieldDef | undefined, metaKey?: string): FilterCondition['op'][] {
  if (metaKey === '$score') return ['gte', 'lte', 'gt', 'lt', 'empty', 'notEmpty'];
  if (metaKey === '$status') return ['equals', 'notEquals'];
  if (metaKey === '$tags') return ['contains', 'empty', 'notEmpty'];
  switch (field?.type) {
    case 'number':
    case 'currency':
    case 'rating':
      return ['gte', 'lte', 'gt', 'lt', 'equals', 'empty', 'notEmpty'];
    case 'select':
    case 'multiselect':
    case 'boolean':
      return ['equals', 'notEquals', 'empty', 'notEmpty'];
    case 'date':
      return ['gte', 'lte', 'equals', 'empty', 'notEmpty'];
    default:
      return ['contains', 'equals', 'notEquals', 'empty', 'notEmpty'];
  }
}
