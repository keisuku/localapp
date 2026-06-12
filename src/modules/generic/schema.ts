import type { FieldDef, StatusDef } from '@/core/types/module';

export const version = 1;

export const fields: FieldDef[] = [
  {
    key: 'title',
    label: '名称',
    type: 'text',
    required: true,
    unique: true,
    aliases: ['名前', 'タイトル', '件名', '項目', 'name', 'title'],
    width: 220,
  },
  {
    key: 'category',
    label: 'カテゴリ',
    type: 'select',
    aliases: ['分類', '種別', 'category'],
    options: [
      { value: '仕事', label: '仕事', color: '#3b82f6' },
      { value: '個人', label: '個人', color: '#22c55e' },
      { value: 'アイデア', label: 'アイデア', color: '#f59e0b' },
      { value: '資料', label: '資料', color: '#8b5cf6' },
      { value: 'その他', label: 'その他', color: '#64748b' },
    ],
    width: 110,
  },
  {
    key: 'priority',
    label: '優先度',
    type: 'rating',
    aliases: ['重要度', 'priority'],
    min: 0,
    max: 5,
    width: 110,
    align: 'center',
  },
  {
    key: 'amount',
    label: '金額',
    type: 'currency',
    aliases: ['価格', '費用', 'コスト', 'amount', 'price'],
    min: 0,
    width: 120,
    align: 'right',
  },
  {
    key: 'date',
    label: '日付',
    type: 'date',
    aliases: ['期日', '締切', '日時', 'date', 'deadline'],
    width: 110,
  },
  {
    key: 'url',
    label: 'URL',
    type: 'url',
    aliases: ['リンク', 'link'],
    showInTable: false,
  },
  {
    key: 'note',
    label: 'メモ',
    type: 'longtext',
    aliases: ['備考', '詳細', 'コメント', 'note', 'memo'],
    width: 240,
  },
];

export const statuses: StatusDef[] = [
  { value: 'open', label: '未着手', color: '#64748b' },
  { value: 'progress', label: '進行中', color: '#3b82f6' },
  { value: 'done', label: '完了', color: '#22c55e' },
  { value: 'hold', label: '保留', color: '#f59e0b' },
];

export const defaultStatus = 'open';
