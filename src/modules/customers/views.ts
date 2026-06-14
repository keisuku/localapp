import type { ViewConfig } from '@/core/types/module';
import { toNumber, formatNumber } from '@/core/utils/format';

export const views: ViewConfig = {
  table: { columnOrder: ['customerId', 'company', 'person', 'email', 'rank', 'annualSales', 'owner', 'lastContact'], defaultSort: { key: '$score', desc: true } },
  card: { titleKey: 'company', subtitleKey: 'person', bodyKeys: ['department', 'email', 'phone', 'note'], badgeKey: 'rank' },
  kanban: { groupByKey: '$status' },
  dashboard: { statCards: [
    { id: 'total', label: '顧客数', compute: (rs) => rs.length },
    { id: 'active', label: '取引中', compute: (rs) => rs.filter((r) => r.status === 'active').length },
    { id: 'rankA', label: 'Aランク', compute: (rs) => rs.filter((r) => r.data.rank === 'A').length },
    { id: 'sales', label: '年間売上合計', compute: (rs) => formatNumber(rs.reduce((sum, r) => sum + (toNumber(r.data.annualSales) ?? 0), 0), '円') },
  ] },
};
