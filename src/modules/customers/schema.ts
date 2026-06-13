import type { FieldDef, StatusDef } from '@/core/types/module';

export const version = 1;

export const fields: FieldDef[] = [
  { key: 'customerId', label: '顧客ID', type: 'text', required: true, unique: true, aliases: ['会員ID', '取引先コード', '顧客コード', 'customer_id', 'id'], width: 130 },
  { key: 'company', label: '会社名', type: 'text', required: true, aliases: ['企業名', '取引先名', '社名', 'company'], width: 190 },
  { key: 'department', label: '部署', type: 'text', aliases: ['部門', 'department'], width: 140 },
  { key: 'person', label: '担当者', type: 'text', aliases: ['氏名', '窓口', 'contact', 'name'], width: 130 },
  { key: 'email', label: 'メール', type: 'text', aliases: ['mail', 'email', 'メールアドレス'], width: 190 },
  { key: 'phone', label: '電話', type: 'text', aliases: ['tel', '電話番号', 'phone'], width: 130 },
  { key: 'prefecture', label: '都道府県', type: 'text', aliases: ['住所1', '都道府県名', 'prefecture'], width: 100 },
  { key: 'lastContact', label: '最終接触日', type: 'date', aliases: ['最終更新日', '最終対応日', 'last_contact'], width: 120 },
  { key: 'rank', label: '顧客ランク', type: 'select', aliases: ['ランク', 'rank'], options: [
    { value: 'A', label: 'A:重点', color: '#22c55e' },
    { value: 'B', label: 'B:通常', color: '#3b82f6' },
    { value: 'C', label: 'C:育成', color: '#f59e0b' },
    { value: 'D', label: 'D:休眠', color: '#94a3b8' },
  ], width: 110 },
  { key: 'annualSales', label: '年間売上', type: 'currency', unit: '円', aliases: ['売上', '年間取引額', 'sales'], min: 0, width: 130, align: 'right' },
  { key: 'owner', label: '自社担当', type: 'text', aliases: ['営業担当', '担当営業', 'owner'], width: 110 },
  { key: 'note', label: 'メモ', type: 'longtext', aliases: ['備考', 'コメント', 'note'], width: 240 },
];

export const statuses: StatusDef[] = [
  { value: 'active', label: '取引中', color: '#22c55e' },
  { value: 'lead', label: '見込み', color: '#3b82f6' },
  { value: 'follow', label: '要フォロー', color: '#f59e0b' },
  { value: 'dormant', label: '休眠', color: '#94a3b8' },
  { value: 'closed', label: '終了', color: '#64748b' },
];

export const defaultStatus = 'lead';
