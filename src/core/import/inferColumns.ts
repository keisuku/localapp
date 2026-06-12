import type { ColumnGuess, ParsedTable } from '@/core/types/import';
import { normalizeHeader, toDateString, toNumber } from '@/core/utils/format';

const SAMPLE_LIMIT = 100;

/** 各列の型をサンプル値から推定する */
export function inferColumns(table: ParsedTable): ColumnGuess[] {
  return table.headers.map((header, colIdx) => {
    const samples: unknown[] = [];
    for (const row of table.rows) {
      if (samples.length >= SAMPLE_LIMIT) break;
      const v = row[colIdx];
      if (v !== null && v !== undefined && String(v).trim() !== '') samples.push(v);
    }
    return {
      header,
      normalizedHeader: normalizeHeader(header),
      guessedType: guessType(samples),
      sampleValues: samples.slice(0, 5).map((v) => String(v)),
    };
  });
}

function guessType(samples: unknown[]): ColumnGuess['guessedType'] {
  if (samples.length === 0) return 'text';

  const numeric = samples.filter((v) => toNumber(v) !== null).length;
  const dates = samples.filter((v) => typeof v !== 'number' && toDateString(v) !== null).length;
  const currencyLike = samples.filter((v) => /[¥￥円]|,\d{3}/.test(String(v))).length;

  if (dates / samples.length >= 0.8) return 'date';
  if (numeric / samples.length >= 0.9) {
    return currencyLike / samples.length >= 0.5 ? 'currency' : 'number';
  }
  // 値の種類が少なく繰り返しが多ければ選択肢とみなす
  const distinct = new Set(samples.map((v) => String(v))).size;
  if (samples.length >= 5 && distinct <= 8 && distinct < samples.length / 2) return 'select';
  return 'text';
}
