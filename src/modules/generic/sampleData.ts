export const sampleData: Record<string, unknown>[] = [
  { title: '四半期売上レポート作成', category: '仕事', priority: 4, date: offsetDate(3), note: '部門別の集計を含める' },
  { title: 'ノートPC 買い替え検討', category: '個人', priority: 2, amount: 180000, note: 'メモリ32GB以上' },
  { title: '新規サービスのネーミング案', category: 'アイデア', priority: 3, note: '候補を10個出す' },
  { title: '業務マニュアル v2 更新', category: '資料', priority: 3, date: offsetDate(10), note: '新フロー反映' },
  { title: '経費精算（5月分）', category: '仕事', priority: 5, amount: 23450, date: offsetDate(1) },
  { title: '読書メモ：データ分析入門', category: '個人', priority: 1, note: '3章まで読了' },
  { title: '社内勉強会の企画', category: 'アイデア', priority: 2, date: offsetDate(21) },
  { title: '取引先リストの整理', category: '仕事', priority: 3, note: '重複チェックが必要' },
];

function offsetDate(days: number): string {
  const d = new Date(Date.now() + days * 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
