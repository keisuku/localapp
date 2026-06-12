export const sampleData: Record<string, unknown>[] = [
  { client: '田中 太郎', kind: '生命保険', company: '日本未来生命', premium: 18500, coverage: 3000, contractDate: '2021-04-15', renewalDate: offsetDate(20), assignee: '佐藤', phone: '090-1234-5678', note: '更新の意向確認が必要' },
  { client: '鈴木 花子', kind: '医療保険', company: 'あんしん損保', premium: 6800, coverage: 500, contractDate: '2022-09-01', renewalDate: offsetDate(75), assignee: '佐藤', phone: '080-2345-6789', note: '特約見直しを提案予定' },
  { client: '高橋 健一', kind: '自動車保険', company: 'セーフティ海上', premium: 9200, contractDate: '2023-11-20', renewalDate: offsetDate(8), assignee: '山本', phone: '070-3456-7890', note: '等級アップ。早めに連絡' },
  { client: '伊藤 美咲', kind: 'がん保険', company: '日本未来生命', premium: 4500, coverage: 200, contractDate: '2020-06-10', renewalDate: offsetDate(150), assignee: '山本' },
  { client: '渡辺 修', kind: '火災保険', company: 'ホームガード保険', premium: 3200, contractDate: '2019-03-25', renewalDate: offsetDate(45), assignee: '佐藤', note: '地震特約の追加を検討中' },
  { client: '小林 由美', kind: '学資保険', company: 'こども未来生命', premium: 12000, coverage: 300, contractDate: '2023-01-15', renewalDate: offsetDate(300), assignee: '中村' },
  { client: '加藤 大輔', kind: '生命保険', company: 'グランド生命', premium: 25000, coverage: 5000, contractDate: '2018-08-01', renewalDate: offsetDate(12), assignee: '中村', phone: '090-4567-8901', note: '高額契約。面談アポ調整中' },
  { client: '吉田 さくら', kind: '医療保険', company: 'あんしん損保', premium: 5400, coverage: 600, contractDate: '2024-02-14', renewalDate: offsetDate(220), assignee: '佐藤' },
  { client: '山田 直樹', kind: '自動車保険', company: 'セーフティ海上', premium: 11800, contractDate: '2022-12-05', renewalDate: offsetDate(-5), assignee: '山本', note: '期日超過。至急対応' },
  { client: '中島 恵', kind: 'その他', company: 'ペットケア少短', premium: 2900, contractDate: '2024-05-30', renewalDate: offsetDate(180), assignee: '中村', note: 'ペット保険' },
];

function offsetDate(days: number): string {
  const d = new Date(Date.now() + days * 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
