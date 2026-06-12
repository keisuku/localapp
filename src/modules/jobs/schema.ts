import type { FieldDef, StatusDef } from '@/core/types/module';

export const version = 1;

export const fields: FieldDef[] = [
  {
    key: 'company',
    label: '会社名',
    type: 'text',
    required: true,
    unique: true,
    aliases: ['企業名', '社名', '会社', 'company'],
    width: 180,
  },
  {
    key: 'position',
    label: '職種',
    type: 'text',
    aliases: ['ポジション', '募集職種', '役職', 'position'],
    width: 170,
  },
  {
    key: 'salary',
    label: '想定年収',
    type: 'number',
    unit: '万円',
    min: 100,
    max: 10000,
    aliases: ['年収', '給与', '想定年収（万円）', '年収万円', 'salary'],
    width: 110,
    align: 'right',
  },
  {
    key: 'location',
    label: '勤務地',
    type: 'text',
    aliases: ['所在地', '勤務場所', 'location'],
    width: 120,
  },
  {
    key: 'remote',
    label: 'リモート',
    type: 'select',
    aliases: ['リモートワーク', '在宅', '働き方', 'remote'],
    options: [
      { value: 'full', label: 'フルリモート', color: '#22c55e' },
      { value: 'hybrid', label: '一部リモート', color: '#3b82f6' },
      { value: 'onsite', label: '出社', color: '#64748b' },
    ],
    width: 120,
  },
  {
    key: 'employment',
    label: '雇用形態',
    type: 'select',
    aliases: ['契約形態', 'employment'],
    options: [
      { value: '正社員', label: '正社員', color: '#3b82f6' },
      { value: '契約社員', label: '契約社員', color: '#8b5cf6' },
      { value: '業務委託', label: '業務委託', color: '#f59e0b' },
      { value: '派遣', label: '派遣', color: '#64748b' },
    ],
    width: 110,
    showInTable: false,
  },
  {
    key: 'workload',
    label: '残業時間',
    type: 'number',
    unit: '時間/月',
    min: 0,
    max: 120,
    aliases: ['残業', '月残業', '平均残業時間', 'overtime'],
    width: 110,
    align: 'right',
    showInTable: false,
  },
  {
    key: 'appeal',
    label: '魅力度',
    type: 'rating',
    min: 0,
    max: 5,
    aliases: ['評価', 'rating'],
    width: 110,
    align: 'center',
  },
  {
    key: 'source',
    label: '媒体',
    type: 'text',
    aliases: ['求人媒体', 'サイト', 'source'],
    width: 110,
    showInTable: false,
  },
  {
    key: 'url',
    label: '求人URL',
    type: 'url',
    aliases: ['リンク', 'link', 'url'],
    showInTable: false,
  },
  {
    key: 'note',
    label: 'メモ',
    type: 'longtext',
    aliases: ['備考', 'コメント', 'note', 'memo'],
    width: 220,
  },
];

export const statuses: StatusDef[] = [
  { value: 'interested', label: '気になる', color: '#64748b' },
  { value: 'plan', label: '応募予定', color: '#3b82f6' },
  { value: 'applied', label: '応募済み', color: '#6366f1' },
  { value: 'interview', label: '面接中', color: '#8b5cf6' },
  { value: 'offer', label: '内定', color: '#22c55e' },
  { value: 'rejected', label: '見送り', color: '#94a3b8' },
];

export const defaultStatus = 'interested';
