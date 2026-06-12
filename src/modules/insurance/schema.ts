import type { FieldDef, StatusDef } from '@/core/types/module';

export const version = 1;

export const fields: FieldDef[] = [
  {
    key: 'client',
    label: '顧客名',
    type: 'text',
    required: true,
    aliases: ['氏名', '名前', '契約者', '契約者名', 'client', 'name'],
    width: 140,
  },
  {
    key: 'kind',
    label: '保険種別',
    type: 'select',
    aliases: ['種別', '保険の種類', '商品種別', 'kind'],
    options: [
      { value: '生命保険', label: '生命保険', color: '#3b82f6' },
      { value: '医療保険', label: '医療保険', color: '#22c55e' },
      { value: 'がん保険', label: 'がん保険', color: '#8b5cf6' },
      { value: '自動車保険', label: '自動車保険', color: '#f59e0b' },
      { value: '火災保険', label: '火災保険', color: '#ef4444' },
      { value: '学資保険', label: '学資保険', color: '#06b6d4' },
      { value: 'その他', label: 'その他', color: '#64748b' },
    ],
    width: 110,
  },
  {
    key: 'company',
    label: '保険会社',
    type: 'text',
    aliases: ['引受会社', '会社名', 'company'],
    width: 150,
  },
  {
    key: 'premium',
    label: '月額保険料',
    type: 'currency',
    min: 0,
    max: 300000,
    aliases: ['保険料', '月額', '月払保険料', 'premium'],
    width: 120,
    align: 'right',
  },
  {
    key: 'coverage',
    label: '保障額',
    type: 'number',
    unit: '万円',
    min: 0,
    aliases: ['保険金額', '保障金額', 'coverage'],
    width: 110,
    align: 'right',
    showInTable: false,
  },
  {
    key: 'contractDate',
    label: '契約日',
    type: 'date',
    aliases: ['成立日', '契約年月日'],
    width: 110,
    showInTable: false,
  },
  {
    key: 'renewalDate',
    label: '更新期日',
    type: 'date',
    aliases: ['更新日', '満期日', '満期', '更新期限'],
    width: 110,
  },
  {
    key: 'assignee',
    label: '担当者',
    type: 'text',
    aliases: ['担当', 'assignee'],
    width: 100,
  },
  {
    key: 'phone',
    label: '電話番号',
    type: 'text',
    aliases: ['連絡先', 'TEL', 'tel', '電話'],
    width: 130,
    showInTable: false,
  },
  {
    key: 'note',
    label: '備考',
    type: 'longtext',
    aliases: ['メモ', 'コメント', 'note', 'memo'],
    width: 220,
  },
];

export const statuses: StatusDef[] = [
  { value: 'lead', label: '見込み', color: '#64748b' },
  { value: 'proposal', label: '提案中', color: '#3b82f6' },
  { value: 'contracted', label: '契約済', color: '#22c55e' },
  { value: 'renewal', label: '更新間近', color: '#f59e0b' },
  { value: 'lapsed', label: '失効', color: '#ef4444' },
];

export const defaultStatus = 'lead';
