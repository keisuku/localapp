import { moduleRegistry } from '@/modules';
import type { FieldDef, ModuleDefinition } from '@/core/types/module';
import type { ColumnGuess, ColumnMapping, ModuleMatch } from '@/core/types/import';
import { SKIP_COLUMN } from '@/core/types/import';
import { normalizeHeader } from '@/core/utils/format';

/** ヘッダーとフィールド定義の一致度（1.0 = 完全一致, 0.6 = 部分一致） */
function headerFieldSimilarity(normalizedHeader: string, field: FieldDef): number {
  const candidates = [field.label, field.key, ...(field.aliases ?? [])].map(normalizeHeader);
  if (candidates.includes(normalizedHeader)) return 1;
  if (
    candidates.some(
      (c) => c.length >= 2 && (normalizedHeader.includes(c) || c.includes(normalizedHeader)),
    )
  ) {
    return 0.6;
  }
  return 0;
}

/** 取り込み候補のモジュールをヘッダー類似度でスコアリングする（自動判定） */
export function matchModules(columns: ColumnGuess[], fieldsByModule?: Map<string, FieldDef[]>): ModuleMatch[] {
  const results: ModuleMatch[] = moduleRegistry.map((module) => {
    const fields = fieldsByModule?.get(module.id) ?? module.fields;
    let total = 0;
    let matched = 0;
    for (const col of columns) {
      const best = Math.max(0, ...fields.map((f) => headerFieldSimilarity(col.normalizedHeader, f)));
      total += best;
      if (best > 0) matched++;
    }
    const denominator = Math.max(columns.length, Math.min(fields.length, columns.length + 2));
    return {
      moduleId: module.id,
      score: denominator > 0 ? total / denominator : 0,
      matchedFields: matched,
    };
  });
  return results.sort((a, b) => b.score - a.score);
}

export const AUTO_MATCH_THRESHOLD = 0.4;

export function bestModule(matches: ModuleMatch[]): string {
  const top = matches[0];
  if (top && top.score >= AUTO_MATCH_THRESHOLD) return top.moduleId;
  return 'generic';
}

/** 選択されたモジュールに対する初期マッピングを作る */
export function buildInitialMapping(
  columns: ColumnGuess[],
  module: ModuleDefinition,
  fields: FieldDef[],
): ColumnMapping {
  void module;
  const mapping: ColumnMapping = {};
  const usedFields = new Set<string>();

  // まず完全一致を割り当て、残りを部分一致で埋める
  for (const pass of [1, 0.6] as const) {
    columns.forEach((col, idx) => {
      if (mapping[idx] !== undefined) return;
      for (const field of fields) {
        if (usedFields.has(field.key)) continue;
        if (headerFieldSimilarity(col.normalizedHeader, field) >= pass) {
          mapping[idx] = field.key;
          usedFields.add(field.key);
          break;
        }
      }
    });
  }
  columns.forEach((_, idx) => {
    if (mapping[idx] === undefined) mapping[idx] = SKIP_COLUMN;
  });
  return mapping;
}
