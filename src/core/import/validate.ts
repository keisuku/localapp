import type { FieldDef } from '@/core/types/module';
import type { ParsedTable, ColumnMapping, ValidationReport } from '@/core/types/import';
import { SKIP_COLUMN } from '@/core/types/import';
import type { AppRecord } from '@/core/types/record';
import { toDateString, toNumber } from '@/core/utils/format';

/** マッピング適用後の行データを組み立てる */
export function buildRowData(
  table: ParsedTable,
  mapping: ColumnMapping,
): Record<string, unknown>[] {
  return table.rows.map((row) => {
    const data: Record<string, unknown> = {};
    table.headers.forEach((_, colIdx) => {
      const target = mapping[colIdx];
      if (!target || target === SKIP_COLUMN) return;
      if (target === '__proto__' || target === 'constructor' || target === 'prototype') return;
      const v = row[colIdx];
      data[target] = v instanceof Date ? toDateString(v) : v;
    });
    return data;
  });
}

/** 必須空欄 / 重複（ファイル内・既存データ） / 異常値 を検出する */
export function validateRows(
  rows: Record<string, unknown>[],
  fields: FieldDef[],
  existing: AppRecord[],
): ValidationReport {
  const report: ValidationReport = {
    rows: {
      requiredEmpty: new Set(),
      duplicateInFile: new Set(),
      duplicateExisting: new Set(),
      anomaly: new Set(),
    },
    emptyCellCount: 0,
    messages: new Map(),
  };

  const addMessage = (idx: number, msg: string) => {
    const list = report.messages.get(idx) ?? [];
    list.push(msg);
    report.messages.set(idx, list);
  };

  const uniqueFields = fields.filter((f) => f.unique);
  const existingKeys = new Map<string, Set<string>>();
  for (const f of uniqueFields) {
    existingKeys.set(
      f.key,
      new Set(
        existing
          .map((r) => normalizeUniqueValue(r.data[f.key]))
          .filter((v): v is string => v !== null),
      ),
    );
  }
  const seenInFile = new Map<string, Set<string>>(uniqueFields.map((f) => [f.key, new Set()]));

  rows.forEach((row, idx) => {
    for (const field of fields) {
      const raw = row[field.key];
      const isEmpty = raw === null || raw === undefined || String(raw).trim() === '';

      if (isEmpty) {
        if (field.key in row) report.emptyCellCount++;
        if (field.required) {
          report.rows.requiredEmpty.add(idx);
          addMessage(idx, `必須項目「${field.label}」が空欄です`);
        }
        continue;
      }

      if (field.unique) {
        const key = normalizeUniqueValue(raw);
        if (key !== null) {
          if (seenInFile.get(field.key)?.has(key)) {
            report.rows.duplicateInFile.add(idx);
            addMessage(idx, `「${field.label}」がファイル内で重複しています（${raw}）`);
          } else if (existingKeys.get(field.key)?.has(key)) {
            report.rows.duplicateExisting.add(idx);
            addMessage(idx, `「${field.label}」が既存データと重複しています（${raw}）`);
          }
          seenInFile.get(field.key)?.add(key);
        }
      }

      if (field.type === 'number' || field.type === 'currency' || field.type === 'rating') {
        const n = toNumber(raw);
        if (n === null) {
          report.rows.anomaly.add(idx);
          addMessage(idx, `「${field.label}」を数値として解釈できません（${raw}）`);
        } else if (
          (field.min !== undefined && n < field.min) ||
          (field.max !== undefined && n > field.max)
        ) {
          report.rows.anomaly.add(idx);
          addMessage(idx, `「${field.label}」が想定範囲外です（${raw}）`);
        }
      } else if (field.type === 'date') {
        if (toDateString(raw) === null) {
          report.rows.anomaly.add(idx);
          addMessage(idx, `「${field.label}」を日付として解釈できません（${raw}）`);
        }
      } else if (field.type === 'select' && field.options?.length) {
        const s = String(raw);
        const ok = field.options.some((o) => o.value === s || o.label === s);
        if (!ok) {
          report.rows.anomaly.add(idx);
          addMessage(idx, `「${field.label}」に未知の値です（${raw}）`);
        }
      }
    }
  });

  return report;
}

function normalizeUniqueValue(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim().toLowerCase();
  return s === '' ? null : s;
}

/** フィールド型に合わせて値を正規化する（コミット直前に適用） */
export function coerceRowData(
  row: Record<string, unknown>,
  fields: FieldDef[],
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...row };
  for (const field of fields) {
    const raw = out[field.key];
    if (raw === null || raw === undefined || String(raw).trim() === '') {
      delete out[field.key];
      continue;
    }
    switch (field.type) {
      case 'number':
      case 'currency': {
        const n = toNumber(raw);
        if (n !== null) out[field.key] = n;
        break;
      }
      case 'rating': {
        const n = toNumber(raw);
        if (n !== null) out[field.key] = Math.max(0, Math.min(field.max ?? 5, Math.round(n)));
        break;
      }
      case 'date': {
        const d = toDateString(raw);
        if (d !== null) out[field.key] = d;
        break;
      }
      case 'boolean': {
        const s = String(raw).toLowerCase();
        out[field.key] = ['true', '1', 'はい', 'yes', '○', '◯', '有'].includes(s);
        break;
      }
      case 'multiselect': {
        if (typeof raw === 'string') {
          out[field.key] = raw
            .split(/[,、;；／/]/)
            .map((s) => s.trim())
            .filter(Boolean);
        }
        break;
      }
      case 'select': {
        // ラベルで入っていたら値へ変換する
        const opt = field.options?.find((o) => o.label === String(raw));
        out[field.key] = opt ? opt.value : String(raw);
        break;
      }
      default:
        out[field.key] = typeof raw === 'string' ? raw : String(raw);
    }
  }
  return out;
}
