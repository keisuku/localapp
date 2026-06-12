import { useMemo } from 'react';
import { useAppStore } from '@/core/store/useAppStore';
import { useEffectiveModule, useRecords } from '@/core/db/queries';
import { filterRecords } from '@/core/search/filterRecords';

/** 現在のモジュール + 検索/フィルター適用後のレコード一覧（全ビュー共通） */
export function useVisibleRecords() {
  const route = useAppStore((s) => s.route);
  const search = useAppStore((s) => s.search);
  const conditions = useAppStore((s) => s.conditions);
  const showArchived = useAppStore((s) => s.showArchived);

  const moduleId = route.kind === 'module' ? route.moduleId : null;
  const effective = useEffectiveModule(moduleId);
  const records = useRecords(moduleId, showArchived);

  const visible = useMemo(
    () => (records ? filterRecords(records, search, conditions) : undefined),
    [records, search, conditions],
  );

  return {
    moduleId,
    module: effective?.module,
    fields: effective?.fields ?? [],
    /** フィルター前（読み込み中は undefined） */
    records,
    /** フィルター後（読み込み中は undefined） */
    visible,
  };
}
