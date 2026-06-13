import type { ScoringFn } from '@/core/types/module';
import { toNumber } from '@/core/utils/format';

export const scoring: ScoringFn = (data) => {
  const sales = toNumber(data.annualSales) ?? 0;
  const rank = typeof data.rank === 'string' ? data.rank : '';
  if (!sales && !rank) return null;
  const rankScore = rank === 'A' ? 45 : rank === 'B' ? 32 : rank === 'C' ? 18 : 8;
  const salesScore = Math.min(55, Math.round((sales / 10000000) * 55));
  return { score: Math.min(100, rankScore + salesScore), breakdown: [
    { label: '顧客ランク', value: rankScore, max: 45 },
    { label: '年間売上', value: salesScore, max: 55 },
  ] };
};
