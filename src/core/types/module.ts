import type { AppRecord } from './record';

export type FieldType =
  | 'text'
  | 'longtext'
  | 'number'
  | 'currency'
  | 'date'
  | 'select'
  | 'multiselect'
  | 'boolean'
  | 'url'
  | 'rating';

export interface FieldOption {
  value: string;
  label: string;
  /** Tailwind が解釈できる CSS カラー（例: '#3b82f6'） */
  color?: string;
}

export interface FieldDef {
  /** record.data 内のキー */
  key: string;
  /** 日本語の表示名 */
  label: string;
  type: FieldType;
  required?: boolean;
  /** インポート時の重複検出キーとして使う */
  unique?: boolean;
  options?: FieldOption[];
  /** number/currency の異常値検出レンジ */
  min?: number;
  max?: number;
  /** 列名マッチングの同義語（例: ['年収', '給与']） */
  aliases?: string[];
  /** テーブル列の初期幅(px) */
  width?: number;
  align?: 'left' | 'right' | 'center';
  /** テーブルでの初期表示（既定: true） */
  showInTable?: boolean;
  placeholder?: string;
  /** number/currency の単位表示（例: '万円', '時間/月'） */
  unit?: string;
}

export interface StatCardDef {
  id: string;
  label: string;
  /** records はモジュール・非アーカイブで絞り込み済み */
  compute: (records: AppRecord[]) => string | number;
  hint?: string;
}

export interface ViewConfig {
  table: {
    columnOrder: string[];
    defaultSort?: { key: string; desc?: boolean };
  };
  card: {
    titleKey: string;
    subtitleKey?: string;
    bodyKeys: string[];
    badgeKey?: string;
  };
  kanban: {
    /** select 型フィールドの key。'$status' でレコードのステータスを使う */
    groupByKey: string;
    columnOrder?: string[];
  };
  dashboard: {
    statCards: StatCardDef[];
  };
}

export interface ScoreBreakdownItem {
  label: string;
  value: number;
  max: number;
}

export interface ScoreResult {
  /** 0〜100 */
  score: number;
  breakdown?: ScoreBreakdownItem[];
}

/** null = スコア算出に必要な情報が不足 */
export type ScoringFn = (data: Record<string, unknown>) => ScoreResult | null;

export interface ModuleLabels {
  /** サイドバー表示名（例: '求人比較'） */
  moduleName: string;
  /** レコードの呼称（例: '求人' → 「求人を追加」） */
  recordName: string;
  /** lucide-react のアイコン名（PascalCase） */
  icon: string;
  emptyStateText: string;
  description: string;
}

export interface StatusDef {
  value: string;
  label: string;
  color: string;
}

export interface ModuleDefinition {
  /** フォルダ名と一致させる */
  id: string;
  /** スキーマバージョン。フィールド変更時にインクリメントし migrate で変換 */
  version: number;
  fields: FieldDef[];
  statuses: StatusDef[];
  defaultStatus: string;
  views: ViewConfig;
  labels: ModuleLabels;
  scoring?: ScoringFn;
  sampleData: Record<string, unknown>[];
  /** 旧バージョンのデータを現行スキーマへ変換する任意フック */
  migrate?: (data: Record<string, unknown>, fromVersion: number) => Record<string, unknown>;
}
