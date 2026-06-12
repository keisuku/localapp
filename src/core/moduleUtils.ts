import type { FieldDef, ModuleDefinition } from '@/core/types/module';

/** settings に保存するカスタムフィールド（関数を含まない直列化可能な形） */
export type CustomFieldDef = Pick<
  FieldDef,
  'key' | 'label' | 'type' | 'required' | 'options' | 'min' | 'max' | 'unit' | 'showInTable'
>;

export const customFieldsKey = (moduleId: string) => `customFields:${moduleId}`;

/** モジュール定義のフィールドにユーザー定義のカスタムフィールドを合成する */
export function mergeFields(module: ModuleDefinition, custom: CustomFieldDef[] | undefined): FieldDef[] {
  if (!custom || custom.length === 0) return module.fields;
  const baseKeys = new Set(module.fields.map((f) => f.key));
  return [...module.fields, ...custom.filter((c) => c.key && !baseKeys.has(c.key))];
}

export function getField(fields: FieldDef[], key: string): FieldDef | undefined {
  return fields.find((f) => f.key === key);
}

/** レコードの代表名（カードのタイトル項目 → 最初のテキスト項目の順に解決） */
export function recordTitle(module: ModuleDefinition, data: Record<string, unknown>): string {
  const v = data[module.views.card.titleKey];
  if (v !== null && v !== undefined && String(v).trim() !== '') return String(v);
  for (const f of module.fields) {
    const fv = data[f.key];
    if (fv !== null && fv !== undefined && String(fv).trim() !== '') return String(fv);
  }
  return '(無題)';
}

export function statusDef(module: ModuleDefinition, value: string) {
  return module.statuses.find((s) => s.value === value);
}

export function statusLabel(module: ModuleDefinition, value: string): string {
  return statusDef(module, value)?.label ?? value;
}

export function optionLabel(field: FieldDef | undefined, value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  const opt = field?.options?.find((o) => o.value === String(value));
  return opt?.label ?? String(value);
}
