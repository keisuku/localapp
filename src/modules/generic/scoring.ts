import type { ScoringFn } from '@/core/types/module';
import { toNumber, toDateString } from '@/core/utils/format';

/** 優先度と期日の近さから対応優先スコアを算出する */
export const scoring: ScoringFn = (data) => {
  const priority = toNumber(data.priority);
  const dateStr = toDateString(data.date);
  if (priority === null && !dateStr) return null;

  const breakdown = [];
  let score = 0;

  if (priority !== null) {
    const v = Math.min(60, Math.max(0, priority) * 12);
    score += v;
    breakdown.push({ label: '優先度', value: v, max: 60 });
  }
  if (dateStr) {
    const days = (new Date(dateStr).getTime() - Date.now()) / 86400000;
    const v = days < 0 ? 40 : days <= 3 ? 35 : days <= 7 ? 25 : days <= 30 ? 12 : 4;
    score += v;
    breakdown.push({ label: '期日の近さ', value: v, max: 40 });
  }

  return { score: Math.round(Math.min(100, score)), breakdown };
};
