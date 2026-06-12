import type { ViewConfig } from '@/core/types/module';
import { toNumber, toDateString, formatNumber } from '@/core/utils/format';

export const views: ViewConfig = {
  table: {
    columnOrder: ['client', 'kind', 'company', 'premium', 'renewalDate', 'assignee', 'note'],
    defaultSort: { key: '$score', desc: true },
  },
  card: {
    titleKey: 'client',
    subtitleKey: 'company',
    bodyKeys: ['premium', 'renewalDate', 'note'],
    badgeKey: 'kind',
  },
  kanban: {
    groupByKey: '$status',
  },
  dashboard: {
    statCards: [
      { id: 'total', label: '案件数', compute: (rs) => rs.length },
      {
        id: 'premiumSum',
        label: '月額保険料合計',
        compute: (rs) =>
          formatNumber(rs.reduce((sum, r) => sum + (toNumber(r.data.premium) ?? 0), 0), '円'),
      },
      {
        id: 'renewal30',
        label: '30日以内に更新',
        compute: (rs) =>
          rs.filter((r) => {
            const d = toDateString(r.data.renewalDate);
            if (!d) return false;
            const days = (new Date(d).getTime() - Date.now()) / 86400000;
            return days >= 0 && days <= 30;
          }).length,
        hint: '優先的に連絡',
      },
      {
        id: 'proposal',
        label: '提案中',
        compute: (rs) => rs.filter((r) => r.status === 'proposal').length,
      },
    ],
  },
};
