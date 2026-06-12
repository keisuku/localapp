import Dexie, { type Table } from 'dexie';
import type {
  AppRecord,
  ImportHistoryEntry,
  SavedFilter,
  SettingEntry,
} from '@/core/types/record';

class AppDB extends Dexie {
  records!: Table<AppRecord, string>;
  importHistory!: Table<ImportHistoryEntry, string>;
  savedFilters!: Table<SavedFilter, string>;
  settings!: Table<SettingEntry, string>;

  constructor() {
    super('local-app-studio');
    this.version(1).stores({
      records: 'id, moduleId, status, *tags, updatedAt, archived, [moduleId+archived]',
      importHistory: 'id, moduleId, importedAt',
      savedFilters: 'id, moduleId',
      settings: 'key',
    });
  }
}

export const db = new AppDB();

export async function getSetting<T>(key: string): Promise<T | undefined> {
  const entry = await db.settings.get(key);
  return entry?.value as T | undefined;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value });
}

/** 全ミューテーション完了時に呼び、保存時刻をステータスバーへ反映する */
export async function touchSaved(): Promise<void> {
  await db.settings.put({ key: 'lastSavedAt', value: Date.now() });
}
