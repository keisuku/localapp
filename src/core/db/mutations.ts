import { db, touchSaved, setSetting } from './db';
import { getModule, moduleRegistry } from '@/modules';
import { newId } from '@/core/utils/id';
import { pushUndoWithToast, undoManager } from '@/core/undo/undoManager';
import { recordTitle } from '@/core/moduleUtils';
import type {
  AppRecord,
  ImportHistoryEntry,
  SavedFilter,
} from '@/core/types/record';
import type { BackupData } from '@/core/types/import';
import { toast } from 'sonner';

/**
 * UI からの書き込みはすべてこのファイルの関数を経由する。
 * 各関数は書き込み前に逆操作を捕捉して Undo トーストを表示し、
 * 完了時に lastSavedAt を更新する（= ステータスバーの保存表示）。
 */

export function computeScore(moduleId: string, data: Record<string, unknown>): number | null {
  const module = getModule(moduleId);
  if (!module?.scoring) return null;
  return module.scoring(data)?.score ?? null;
}

function buildRecord(
  moduleId: string,
  data: Record<string, unknown>,
  overrides: Partial<AppRecord> = {},
): AppRecord {
  const module = getModule(moduleId);
  const now = Date.now();
  return {
    id: newId(),
    moduleId,
    data: sanitizeData(data),
    tags: [],
    status: module?.defaultStatus ?? '',
    score: computeScore(moduleId, data),
    archived: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/** JSON 取り込み等によるプロトタイプ汚染を防ぐ */
export function sanitizeData(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
    out[k] = v;
  }
  return out;
}

export async function createRecord(
  moduleId: string,
  data: Record<string, unknown>,
  overrides: Partial<AppRecord> = {},
): Promise<AppRecord> {
  const record = buildRecord(moduleId, data, overrides);
  await db.records.add(record);
  await touchSaved();
  const module = getModule(moduleId);
  const name = module ? recordTitle(module, data) : '';
  pushUndoWithToast(`「${name}」を追加しました`, async () => {
    await db.records.delete(record.id);
    await touchSaved();
  });
  return record;
}

export async function updateRecord(
  id: string,
  patch: { data?: Record<string, unknown>; status?: string; tags?: string[] },
  options: { silent?: boolean } = {},
): Promise<void> {
  const prev = await db.records.get(id);
  if (!prev) return;
  const next: AppRecord = {
    ...prev,
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    ...(patch.tags !== undefined ? { tags: patch.tags } : {}),
    ...(patch.data !== undefined
      ? (() => {
          const data = sanitizeData({ ...prev.data, ...patch.data });
          return { data, score: computeScore(prev.moduleId, data) };
        })()
      : {}),
    updatedAt: Date.now(),
  };
  await db.records.put(next);
  await touchSaved();
  if (!options.silent) {
    const module = getModule(prev.moduleId);
    const name = module ? recordTitle(module, next.data) : '';
    pushUndoWithToast(`「${name}」を更新しました`, async () => {
      await db.records.put(prev);
      await touchSaved();
    });
  }
}

export async function duplicateRecords(ids: string[]): Promise<void> {
  const originals = (await db.records.bulkGet(ids)).filter((r): r is AppRecord => !!r);
  if (originals.length === 0) return;
  const now = Date.now();
  const copies: AppRecord[] = originals.map((r) => {
    const module = getModule(r.moduleId);
    const titleKey = module?.views.card.titleKey;
    const data = { ...r.data };
    if (titleKey && typeof data[titleKey] === 'string') {
      data[titleKey] = `${data[titleKey]} のコピー`;
    }
    return { ...r, id: newId(), data, createdAt: now, updatedAt: now };
  });
  await db.records.bulkAdd(copies);
  await touchSaved();
  const copyIds = copies.map((c) => c.id);
  pushUndoWithToast(`${copies.length}件を複製しました`, async () => {
    await db.records.bulkDelete(copyIds);
    await touchSaved();
  });
}

export async function deleteRecords(ids: string[]): Promise<void> {
  const snapshot = (await db.records.bulkGet(ids)).filter((r): r is AppRecord => !!r);
  if (snapshot.length === 0) return;
  await db.records.bulkDelete(ids);
  await touchSaved();
  pushUndoWithToast(`${snapshot.length}件を削除しました`, async () => {
    await db.records.bulkAdd(snapshot);
    await touchSaved();
  });
}

export async function setArchived(ids: string[], archived: boolean): Promise<void> {
  const snapshot = (await db.records.bulkGet(ids)).filter((r): r is AppRecord => !!r);
  if (snapshot.length === 0) return;
  const now = Date.now();
  await db.records.bulkPut(
    snapshot.map((r) => ({ ...r, archived: archived ? 1 : 0, updatedAt: now })),
  );
  await touchSaved();
  pushUndoWithToast(
    `${snapshot.length}件を${archived ? 'アーカイブ' : 'アーカイブ解除'}しました`,
    async () => {
      await db.records.bulkPut(snapshot);
      await touchSaved();
    },
  );
}

export async function setStatus(ids: string[], status: string): Promise<void> {
  const snapshot = (await db.records.bulkGet(ids)).filter((r): r is AppRecord => !!r);
  if (snapshot.length === 0) return;
  const now = Date.now();
  await db.records.bulkPut(snapshot.map((r) => ({ ...r, status, updatedAt: now })));
  await touchSaved();
  const module = getModule(snapshot[0].moduleId);
  const label = module?.statuses.find((s) => s.value === status)?.label ?? status;
  pushUndoWithToast(`${snapshot.length}件を「${label}」に変更しました`, async () => {
    await db.records.bulkPut(snapshot);
    await touchSaved();
  });
}

export async function addTags(ids: string[], tags: string[]): Promise<void> {
  const snapshot = (await db.records.bulkGet(ids)).filter((r): r is AppRecord => !!r);
  if (snapshot.length === 0 || tags.length === 0) return;
  const now = Date.now();
  await db.records.bulkPut(
    snapshot.map((r) => ({
      ...r,
      tags: Array.from(new Set([...r.tags, ...tags])),
      updatedAt: now,
    })),
  );
  await touchSaved();
  pushUndoWithToast(`${snapshot.length}件にタグを追加しました`, async () => {
    await db.records.bulkPut(snapshot);
    await touchSaved();
  });
}

export async function removeTag(ids: string[], tag: string): Promise<void> {
  const snapshot = (await db.records.bulkGet(ids)).filter((r): r is AppRecord => !!r);
  if (snapshot.length === 0) return;
  const now = Date.now();
  await db.records.bulkPut(
    snapshot.map((r) => ({ ...r, tags: r.tags.filter((t) => t !== tag), updatedAt: now })),
  );
  await touchSaved();
  pushUndoWithToast(`タグ「${tag}」を外しました`, async () => {
    await db.records.bulkPut(snapshot);
    await touchSaved();
  });
}

export async function bulkPatchData(
  ids: string[],
  patch: Record<string, unknown>,
): Promise<void> {
  const snapshot = (await db.records.bulkGet(ids)).filter((r): r is AppRecord => !!r);
  if (snapshot.length === 0) return;
  const now = Date.now();
  await db.records.bulkPut(
    snapshot.map((r) => {
      const data = sanitizeData({ ...r.data, ...patch });
      return { ...r, data, score: computeScore(r.moduleId, data), updatedAt: now };
    }),
  );
  await touchSaved();
  pushUndoWithToast(`${snapshot.length}件を一括編集しました`, async () => {
    await db.records.bulkPut(snapshot);
    await touchSaved();
  });
}

export async function importRecords(
  moduleId: string,
  rows: Record<string, unknown>[],
  meta: Pick<ImportHistoryEntry, 'fileName' | 'fileType' | 'skippedCount' | 'issues'>,
): Promise<{ records: AppRecord[]; historyId: string }> {
  const records = rows.map((row) => buildRecord(moduleId, row));
  const history: ImportHistoryEntry = {
    id: newId(),
    moduleId,
    importedAt: Date.now(),
    rowCount: records.length,
    recordIds: records.map((r) => r.id),
    ...meta,
  };
  await db.transaction('rw', db.records, db.importHistory, async () => {
    await db.records.bulkAdd(records);
    await db.importHistory.add(history);
  });
  await touchSaved();
  const ids = records.map((r) => r.id);
  pushUndoWithToast(`${records.length}件を取り込みました`, async () => {
    await db.transaction('rw', db.records, db.importHistory, async () => {
      await db.records.bulkDelete(ids);
      await db.importHistory.delete(history.id);
    });
    await touchSaved();
  });
  return { records, historyId: history.id };
}

/** 取り込み履歴から、そのインポートで追加されたレコードを取り消す */
export async function revertImport(historyId: string): Promise<void> {
  const entry = await db.importHistory.get(historyId);
  if (!entry) return;
  const snapshot = (await db.records.bulkGet(entry.recordIds)).filter(
    (r): r is AppRecord => !!r,
  );
  await db.records.bulkDelete(entry.recordIds);
  await touchSaved();
  pushUndoWithToast(`インポート（${entry.fileName}）を取り消しました`, async () => {
    await db.records.bulkAdd(snapshot);
    await touchSaved();
  });
}

export async function loadSampleData(moduleIds?: string[]): Promise<number> {
  const targets = moduleIds
    ? moduleRegistry.filter((m) => moduleIds.includes(m.id))
    : moduleRegistry;
  const records: AppRecord[] = [];
  for (const m of targets) {
    const statuses = m.statuses.map((s) => s.value);
    m.sampleData.forEach((row, i) => {
      records.push(
        buildRecord(m.id, row, {
          // サンプルにはステータスのばらつきを持たせ、カンバンが映えるようにする
          status: statuses[i % statuses.length] ?? m.defaultStatus,
          tags: i % 3 === 0 ? ['サンプル', '注目'] : ['サンプル'],
        }),
      );
    });
  }
  await db.records.bulkAdd(records);
  await touchSaved();
  const ids = records.map((r) => r.id);
  pushUndoWithToast(`サンプルデータ ${records.length}件 を読み込みました`, async () => {
    await db.records.bulkDelete(ids);
    await touchSaved();
  });
  return records.length;
}

export async function clearModule(moduleId: string): Promise<void> {
  const snapshot = await db.records.where('moduleId').equals(moduleId).toArray();
  await db.records.where('moduleId').equals(moduleId).delete();
  await touchSaved();
  pushUndoWithToast(`${snapshot.length}件のデータを削除しました`, async () => {
    await db.records.bulkAdd(snapshot);
    await touchSaved();
  });
}

export async function clearAllData(): Promise<void> {
  const [records, importHistory, savedFilters] = await Promise.all([
    db.records.toArray(),
    db.importHistory.toArray(),
    db.savedFilters.toArray(),
  ]);
  await db.transaction('rw', db.records, db.importHistory, db.savedFilters, async () => {
    await db.records.clear();
    await db.importHistory.clear();
    await db.savedFilters.clear();
  });
  await touchSaved();
  pushUndoWithToast('すべてのデータを初期化しました', async () => {
    await db.transaction('rw', db.records, db.importHistory, db.savedFilters, async () => {
      await db.records.bulkAdd(records);
      await db.importHistory.bulkAdd(importHistory);
      await db.savedFilters.bulkAdd(savedFilters);
    });
    await touchSaved();
  });
}

export async function restoreBackup(backup: BackupData): Promise<void> {
  const [records, importHistory, savedFilters, settings] = await Promise.all([
    db.records.toArray(),
    db.importHistory.toArray(),
    db.savedFilters.toArray(),
    db.settings.toArray(),
  ]);
  await db.transaction(
    'rw',
    db.records,
    db.importHistory,
    db.savedFilters,
    db.settings,
    async () => {
      await db.records.clear();
      await db.importHistory.clear();
      await db.savedFilters.clear();
      await db.settings.clear();
      await db.records.bulkAdd(
        (backup.records as AppRecord[]).map((r) => ({ ...r, data: sanitizeData(r.data ?? {}) })),
      );
      await db.importHistory.bulkAdd(backup.importHistory as ImportHistoryEntry[]);
      await db.savedFilters.bulkAdd(backup.savedFilters as SavedFilter[]);
      await db.settings.bulkAdd(backup.settings as { key: string; value: unknown }[]);
    },
  );
  await touchSaved();
  undoManager.push({
    label: 'バックアップから復元しました',
    undo: async () => {
      await db.transaction(
        'rw',
        db.records,
        db.importHistory,
        db.savedFilters,
        db.settings,
        async () => {
          await db.records.clear();
          await db.importHistory.clear();
          await db.savedFilters.clear();
          await db.settings.clear();
          await db.records.bulkAdd(records);
          await db.importHistory.bulkAdd(importHistory);
          await db.savedFilters.bulkAdd(savedFilters);
          await db.settings.bulkAdd(settings);
        },
      );
      await touchSaved();
    },
  });
  toast.success(`バックアップから ${backup.records.length}件 を復元しました`, {
    action: { label: '元に戻す', onClick: () => void undoManager.undoLast() },
  });
}

export async function saveFilter(filter: Omit<SavedFilter, 'id'>): Promise<void> {
  await db.savedFilters.add({ ...filter, id: newId() });
  await touchSaved();
  toast.success(`フィルター「${filter.name}」を保存しました`);
}

export async function deleteSavedFilter(id: string): Promise<void> {
  await db.savedFilters.delete(id);
  await touchSaved();
}

export { setSetting };
