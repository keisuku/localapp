/** 全モジュール共通のレコード型。業務固有の値は data に持つ。 */
export interface AppRecord {
  id: string;
  moduleId: string;
  data: Record<string, unknown>;
  tags: string[];
  status: string;
  score: number | null;
  /** IndexedDB は boolean を索引できないため 0|1 で保持する */
  archived: 0 | 1;
  createdAt: number;
  updatedAt: number;
}

export interface ImportHistoryEntry {
  id: string;
  moduleId: string;
  fileName: string;
  fileType: 'xlsx' | 'csv' | 'json' | 'clipboard';
  importedAt: number;
  rowCount: number;
  skippedCount: number;
  recordIds: string[];
  issues: {
    requiredEmpty: number;
    duplicate: number;
    anomaly: number;
    emptyCells: number;
  };
}

export interface SavedFilter {
  id: string;
  moduleId: string;
  name: string;
  conditions: FilterCondition[];
  search?: string;
}

export type FilterOp =
  | 'contains'
  | 'equals'
  | 'notEquals'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'empty'
  | 'notEmpty';

export interface FilterCondition {
  /** data のキー、またはメタ項目 '$status' | '$tags' | '$score' */
  fieldKey: string;
  op: FilterOp;
  value?: string;
}

export interface SettingEntry {
  key: string;
  value: unknown;
}
