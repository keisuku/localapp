import type { ScoringFn } from '@/core/types/module';
import { toNumber, toDateString } from '@/core/utils/format';

/**
 * 対応優先度スコア（0-100）
 * 更新期日の近さ 50 / 月額保険料の大きさ 30 / 商談フェーズ 20
 */
export const scoring: ScoringFn = (data) => {
  const renewal = toDateString(data.renewalDate);
  const premium = toNumber(data.premium);
  if (!renewal && premium === null) return null;

  const breakdown = [];
  let score = 0;

  if (renewal) {
    const days = (new Date(renewal).getTime() - Date.now()) / 86400000;
    const v = days < 0 ? 50 : days <= 30 ? 45 : days <= 90 ? 30 : days <= 180 ? 15 : 5;
    score += v;
    breakdown.push({ label: '更新期日の近さ', value: v, max: 50 });
  }
  if (premium !== null) {
    const v = Math.round(Math.min(30, premium / 1000));
    score += v;
    breakdown.push({ label: '保険料規模', value: v, max: 30 });
  }

  return { score: Math.min(100, score), breakdown };
};
