import { cn } from '@/core/utils/cn';

/** 0-100 のスコアをカラーバー付きで表示する */
export function ScoreBar({ score, className }: { score: number | null; className?: string }) {
  if (score === null || score === undefined) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }
  const clamped = Math.max(0, Math.min(100, score));
  // 低スコア=グレー → 中=ブルー → 高=ネイビーの業務的な配色
  const hue = 215;
  const color = `hsl(${hue} ${30 + clamped * 0.6}% ${62 - clamped * 0.22}%)`;
  return (
    <span className={cn('inline-flex w-full max-w-[120px] items-center gap-2', className)}>
      <span className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
        <span
          className="block h-full rounded-full transition-all"
          style={{ width: `${clamped}%`, backgroundColor: color }}
        />
      </span>
      <span className="tabular w-7 shrink-0 text-right text-xs font-semibold">{clamped}</span>
    </span>
  );
}
