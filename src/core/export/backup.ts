import { db } from '@/core/db/db';
import type { BackupData } from '@/core/types/import';
import { downloadBlob, dateStamp } from './exportData';

export const BACKUP_VERSION = 1;

/** 全データ（レコード・履歴・フィルター・設定）を 1 つの JSON に書き出す */
export async function exportBackup(): Promise<void> {
  const [records, importHistory, savedFilters, settings] = await Promise.all([
    db.records.toArray(),
    db.importHistory.toArray(),
    db.savedFilters.toArray(),
    db.settings.toArray(),
  ]);
  const backup: BackupData = {
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    records,
    importHistory,
    savedFilters,
    settings,
  };
  downloadBlob(
    new Blob([JSON.stringify(backup)], { type: 'application/json' }),
    `local-app-studio-backup-${dateStamp()}.json`,
  );
}

export function validateBackup(backup: BackupData): string | null {
  if (typeof backup.version !== 'number' || backup.version > BACKUP_VERSION) {
    return 'このバックアップはより新しいバージョンのアプリで作成されています。';
  }
  if (!Array.isArray(backup.records)) return 'バックアップの形式が不正です。';
  return null;
}
