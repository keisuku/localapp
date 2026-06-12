import type { ScoringFn } from '@/core/types/module';
import { toNumber } from '@/core/utils/format';

/**
 * 求人の総合スコア（0-100）
 * 年収 40 / リモート 20 / 魅力度 20 / 残業の少なさ 20
 */
export const scoring: ScoringFn = (data) => {
  const salary = toNumber(data.salary);
  const appeal = toNumber(data.appeal);
  const workload = toNumber(data.workload);
  const remote = typeof data.remote === 'string' ? data.remote : null;

  if (salary === null && appeal === null && workload === null && !remote) return null;

  const breakdown = [];
  let score = 0;

  if (salary !== null) {
    // 300万円 → 0点、1000万円以上 → 満点
    const v = Math.round(Math.min(40, Math.max(0, ((salary - 300) / 700) * 40)));
    score += v;
    breakdown.push({ label: '年収', value: v, max: 40 });
  }
  if (remote) {
    const v = remote === 'full' ? 20 : remote === 'hybrid' ? 12 : 4;
    score += v;
    breakdown.push({ label: 'リモート', value: v, max: 20 });
  }
  if (appeal !== null) {
    const v = Math.round(Math.min(20, Math.max(0, appeal) * 4));
    score += v;
    breakdown.push({ label: '魅力度', value: v, max: 20 });
  }
  if (workload !== null) {
    const v = Math.round(Math.max(0, 20 - workload / 3));
    score += v;
    breakdown.push({ label: '残業の少なさ', value: v, max: 20 });
  }

  return { score: Math.min(100, score), breakdown };
};
