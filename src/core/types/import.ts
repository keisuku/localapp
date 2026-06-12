/** ファイル/クリップボードから読み取った表形式データ */
export interface ParsedTable {
  headers: string[];
  rows: unknown[][];
  sourceName: string;
  fileType: 'xlsx' | 'csv' | 'json' | 'clipboard';
  sheetNames?: string[];
  activeSheet?: string;
}

export interface BackupData {
  version: number;
  exportedAt: number;
  records: unknown[];
  importHistory: unknown[];
  savedFilters: unknown[];
  settings: unknown[];
}

export type ParseResult =
  | { kind: 'table'; table: ParsedTable }
  | { kind: 'backup'; backup: BackupData };

/** 列インデックス → マッピング先。'__skip__' は取り込まない */
export type ColumnMapping = Record<number, string>;
export const SKIP_COLUMN = '__skip__';

export interface ColumnGuess {
  header: string;
  normalizedHeader: string;
  guessedType: 'text' | 'number' | 'currency' | 'date' | 'select';
  sampleValues: string[];
}

export interface ModuleMatch {
  moduleId: string;
  score: number;
  matchedFields: number;
}

export interface ValidationIssueRows {
  requiredEmpty: Set<number>;
  duplicateInFile: Set<number>;
  duplicateExisting: Set<number>;
  anomaly: Set<number>;
}

export interface ValidationReport {
  rows: ValidationIssueRows;
  emptyCellCount: number;
  /** 行インデックス → 問題の説明（ツールチップ等で表示） */
  messages: Map<number, string[]>;
}

export interface ImportSummary {
  imported: number;
  skipped: number;
  duplicates: number;
  anomalies: number;
  requiredEmpty: number;
  emptyCells: number;
  moduleId: string;
  fileName: string;
}
