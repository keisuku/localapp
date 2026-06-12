import type { FieldDef, ModuleDefinition } from '@/core/types/module';

/**
 * 現在のモジュール構成（カスタムフィールド込み）から
 * 新モジュール用の schema.ts / labels.ts の雛形コードを生成する。
 * 「設定画面で試作 → コードに固定して横展開」のための機能。
 */
export function generateModuleScaffold(module: ModuleDefinition, fields: FieldDef[]): string {
  const fieldLines = fields
    .map((f) => {
      const parts = [
        `key: '${f.key}'`,
        `label: '${f.label}'`,
        `type: '${f.type}'`,
        f.required ? 'required: true' : null,
        f.unique ? 'unique: true' : null,
        f.unit ? `unit: '${f.unit}'` : null,
        f.min !== undefined ? `min: ${f.min}` : null,
        f.max !== undefined ? `max: ${f.max}` : null,
        f.options?.length
          ? `options: [${f.options.map((o) => `{ value: '${o.value}', label: '${o.label}'${o.color ? `, color: '${o.color}'` : ''} }`).join(', ')}]`
          : null,
        f.aliases?.length ? `aliases: [${f.aliases.map((a) => `'${a}'`).join(', ')}]` : null,
        f.showInTable === false ? 'showInTable: false' : null,
      ].filter(Boolean);
      return `  { ${parts.join(', ')} },`;
    })
    .join('\n');

  const statusLines = module.statuses
    .map((s) => `  { value: '${s.value}', label: '${s.label}', color: '${s.color}' },`)
    .join('\n');

  return `// ============================================================
// 新モジュールの雛形（${module.labels.moduleName} の構成から生成）
// src/modules/<新モジュールID>/ に schema.ts / labels.ts として保存し、
// sampleData.ts / scoring.ts / views.ts / index.ts を追加してください。
// 詳細は README の「モジュールの追加方法」を参照。
// ============================================================

// ---------- schema.ts ----------
import type { FieldDef, StatusDef } from '@/core/types/module';

export const version = 1;

export const fields: FieldDef[] = [
${fieldLines}
];

export const statuses: StatusDef[] = [
${statusLines}
];

export const defaultStatus = '${module.defaultStatus}';

// ---------- labels.ts ----------
import type { ModuleLabels } from '@/core/types/module';

export const labels: ModuleLabels = {
  moduleName: '新しいモジュール',
  recordName: 'レコード',
  icon: '${module.labels.icon}',
  emptyStateText: 'まだデータがありません。',
  description: 'モジュールの説明',
};
`;
}
