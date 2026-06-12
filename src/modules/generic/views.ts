import type { ViewConfig } from '@/core/types/module';
import { toNumber, toDateString, formatNumber } from '@/core/utils/format';

export const views: ViewConfig = {
  table: {
    columnOrder: ['title', 'category', 'priority', 'amount', 'date', 'note'],
    defaultSort: { key: '$score', desc: true },
  },
  card: {
    titleKey: 'title',
    subtitleKey: 'category',
    bodyKeys: ['amount', 'date', 'note'],
    badgeKey: 'category',
  },
  kanban: {
    groupByKey: '$status',
  },
  dashboard: {
    statCards: [
      { id: 'total', label: '登録件数', compute: (rs) => rs.length, hint: 'アーカイブを除く' },
      {
        id: 'progress',
        label: '進行中',
        compute: (rs) => rs.filter((r) => r.status === 'progress').length,
      },
      {
        id: 'amount',
        label: '合計金額',
        compute: (rs) =>
          formatNumber(rs.reduce((sum, r) => sum + (toNumber(r.data.amount) ?? 0), 0), '円'),
      },
      {
        id: 'dueSoon',
        label: '7日以内の期日',
        compute: (rs) =>
          rs.filter((r) => {
            const d = toDateString(r.data.date);
            if (!d) return false;
            const days = (new Date(d).getTime() - Date.now()) / 86400000;
            return days >= 0 && days <= 7;
          }).length,
      },
    ],
  },
};
