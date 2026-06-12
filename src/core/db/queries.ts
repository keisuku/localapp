import { useLiveQuery } from 'dexie-react-hooks';
import { db, getSetting } from './db';
import { getModule } from '@/modules';
import { mergeFields, customFieldsKey, type CustomFieldDef } from '@/core/moduleUtils';
import type { AppRecord } from '@/core/types/record';
import type { FieldDef, ModuleDefinition } from '@/core/types/module';

/** モジュールのレコード一覧（undefined = 読み込み中） */
export function useRecords(
  moduleId: string | null,
  includeArchived: boolean,
): AppRecord[] | undefined {
  return useLiveQuery(async () => {
    if (!moduleId) return [];
    if (includeArchived) {
      return db.records.where('moduleId').equals(moduleId).toArray();
    }
    return db.records.where('[moduleId+archived]').equals([moduleId, 0]).toArray();
  }, [moduleId, includeArchived]);
}

export function useRecord(id: string | null): AppRecord | undefined {
  return useLiveQuery(async () => (id ? db.records.get(id) : undefined), [id]);
}

export function useAllRecords(): AppRecord[] | undefined {
  return useLiveQuery(() => db.records.toArray(), []);
}

/** サイドバー用：モジュール別の件数（非アーカイブ） */
export function useModuleCounts(): Record<string, number> | undefined {
  return useLiveQuery(async () => {
    const all = await db.records.where('archived').equals(0).toArray();
    const counts: Record<string, number> = {};
    for (const r of all) counts[r.moduleId] = (counts[r.moduleId] ?? 0) + 1;
    return counts;
  }, []);
}

export function useSettingValue<T>(key: string): T | undefined {
  return useLiveQuery(() => getSetting<T>(key), [key]);
}

export function useLastSavedAt(): number | undefined {
  return useSettingValue<number>('lastSavedAt');
}

export function useImportHistory(moduleId?: string) {
  return useLiveQuery(async () => {
    const all = await db.importHistory.orderBy('importedAt').reverse().toArray();
    return moduleId ? all.filter((h) => h.moduleId === moduleId) : all;
  }, [moduleId]);
}

export function useSavedFilters(moduleId: string | null) {
  return useLiveQuery(
    async () => (moduleId ? db.savedFilters.where('moduleId').equals(moduleId).toArray() : []),
    [moduleId],
  );
}

export interface EffectiveModule {
  module: ModuleDefinition;
  /** モジュール定義 + ユーザー定義カスタムフィールド */
  fields: FieldDef[];
}

/** カスタムフィールドを合成したモジュール定義を返す */
export function useEffectiveModule(moduleId: string | null): EffectiveModule | undefined {
  const custom = useSettingValue<CustomFieldDef[]>(
    moduleId ? customFieldsKey(moduleId) : 'customFields:__none__',
  );
  if (!moduleId) return undefined;
  const module = getModule(moduleId);
  if (!module) return undefined;
  return { module, fields: mergeFields(module, custom) };
}

export function useRecordCount(): number | undefined {
  return useLiveQuery(() => db.records.count(), []);
}
