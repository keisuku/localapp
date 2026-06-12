import type { ViewConfig } from '@/core/types/module';
import { toNumber, formatNumber } from '@/core/utils/format';

export const views: ViewConfig = {
  table: {
    columnOrder: ['company', 'position', 'salary', 'remote', 'location', 'appeal', 'note'],
    defaultSort: { key: '$score', desc: true },
  },
  card: {
    titleKey: 'company',
    subtitleKey: 'position',
    bodyKeys: ['salary', 'location', 'note'],
    badgeKey: 'remote',
  },
  kanban: {
    groupByKey: '$status',
  },
  dashboard: {
    statCards: [
      { id: 'total', label: '登録求人数', compute: (rs) => rs.length },
      {
        id: 'avgSalary',
        label: '平均想定年収',
        compute: (rs) => {
          const vals = rs
            .map((r) => toNumber(r.data.salary))
            .filter((v): v is number => v !== null);
          if (vals.length === 0) return '—';
          return formatNumber(Math.round(vals.reduce((a, b) => a + b, 0) / vals.length), '万円');
        },
      },
      {
        id: 'interview',
        label: '面接中',
        compute: (rs) => rs.filter((r) => r.status === 'interview').length,
      },
      {
        id: 'offer',
        label: '内定',
        compute: (rs) => rs.filter((r) => r.status === 'offer').length,
      },
    ],
  },
};
