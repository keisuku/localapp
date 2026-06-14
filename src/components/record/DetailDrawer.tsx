import { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  ArchiveRestore,
  ChevronDown,
  ChevronUp,
  Copy,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/core/store/useAppStore';
import { useRecord } from '@/core/db/queries';
import { useVisibleRecords } from '@/hooks/useVisibleRecords';
import {
  createRecord,
  deleteRecords,
  duplicateRecords,
  setArchived,
  updateRecord,
} from '@/core/db/mutations';
import { confirmDialog } from '@/core/store/confirmStore';
import { recordTitle } from '@/core/moduleUtils';
import { RecordForm } from './RecordForm';
import { FieldValue } from '@/components/common/FieldValue';
import { ScoreBar } from '@/components/common/ScoreBar';
import { StatusChip } from '@/components/common/StatusChip';
import { formatDateTime } from '@/core/utils/format';
import { getModule } from '@/modules';

/** 右側の詳細ドロワー（閲覧・編集・新規作成） */
export function DetailDrawer() {
  const drawer = useAppStore((s) => s.drawer);
  const closeDrawer = useAppStore((s) => s.closeDrawer);
  const openDrawer = useAppStore((s) => s.openDrawer);
  const { module, fields, visible } = useVisibleRecords();

  const record = useRecord(drawer?.recordId ?? null);
  const recordModule = record ? getModule(record.moduleId) : module;

  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [draftStatus, setDraftStatus] = useState('');
  const [draftTags, setDraftTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const editing = drawer?.mode === 'edit' || drawer?.mode === 'create';

  useEffect(() => {
    if (!drawer) return;
    if (drawer.mode === 'create') {
      setDraft({});
      setDraftStatus(module?.defaultStatus ?? '');
      setDraftTags([]);
    } else if (record) {
      setDraft({ ...record.data });
      setDraftStatus(record.status);
      setDraftTags([...record.tags]);
    }
    setErrors({});
    setTagInput('');
  }, [drawer?.mode, drawer?.recordId, record?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const index = useMemo(
    () => (record && visible ? visible.findIndex((r) => r.id === record.id) : -1),
    [record, visible],
  );

  if (!drawer || !recordModule) return null;
  const m = recordModule;

  const moveTo = (offset: number) => {
    if (!visible || index < 0) return;
    const next = visible[index + offset];
    if (next) openDrawer({ mode: 'view', recordId: next.id });
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    for (const f of fields) {
      if (f.required) {
        const v = draft[f.key];
        if (v === null || v === undefined || String(v).trim() === '') {
          errs[f.key] = `${f.label}は必須です`;
        }
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    if (drawer.mode === 'create') {
      const created = await createRecord(m.id, draft, {
        status: draftStatus,
        tags: draftTags,
      });
      openDrawer({ mode: 'view', recordId: created.id });
    } else if (record) {
      await updateRecord(
        record.id,
        { data: draft, status: draftStatus, tags: draftTags },
        { replaceData: true },
      );
      openDrawer({ mode: 'view', recordId: record.id });
    }
  };

  const remove = async () => {
    if (!record) return;
    const ok = await confirmDialog({
      title: `${m.labels.recordName}を削除しますか？`,
      description: `「${recordTitle(m, record.data)}」を削除します。削除後もトーストの「元に戻す」で復元できます。`,
      confirmLabel: '削除する',
      destructive: true,
    });
    if (!ok) return;
    closeDrawer();
    await deleteRecords([record.id]);
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !draftTags.includes(t)) setDraftTags([...draftTags, t]);
    setTagInput('');
  };

  const scoreResult = m.scoring && record ? m.scoring(record.data) : null;

  return (
    <Sheet open={!!drawer} onOpenChange={(v) => !v && closeDrawer()}>
      <SheetContent
        side="right"
        className="w-[440px] gap-0 overflow-hidden sm:max-w-[440px]"
        showCloseButton={false}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <SheetHeader className="border-b pb-3">
          <div className="flex items-center gap-1">
            <SheetTitle className="flex-1 truncate text-base">
              {drawer.mode === 'create'
                ? `${m.labels.recordName}を追加`
                : record
                  ? recordTitle(m, record.data)
                  : ''}
            </SheetTitle>
            {drawer.mode === 'view' && (
              <>
                <Button
                  variant="ghost"
                  size="iconSm"
                  disabled={index <= 0}
                  onClick={() => moveTo(-1)}
                  title="前のレコード（K）"
                >
                  <ChevronUp />
                </Button>
                <Button
                  variant="ghost"
                  size="iconSm"
                  disabled={!visible || index < 0 || index >= visible.length - 1}
                  onClick={() => moveTo(1)}
                  title="次のレコード（J）"
                >
                  <ChevronDown />
                </Button>
              </>
            )}
            <Button variant="ghost" size="iconSm" onClick={closeDrawer}>
              <X />
            </Button>
          </div>
          {drawer.mode === 'view' && visible && index >= 0 && (
            <SheetDescription className="tabular text-xs">
              {index + 1} / {visible.length} 件目
            </SheetDescription>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4">
          {editing ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="text-muted-foreground text-xs font-medium">ステータス</div>
                <Select value={draftStatus} onValueChange={setDraftStatus}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {m.statuses.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        <span className="flex items-center gap-2">
                          <span className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
                          {s.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <RecordForm fields={fields} value={draft} onChange={setDraft} errors={errors} />

              <div className="space-y-1.5">
                <div className="text-muted-foreground text-xs font-medium">タグ</div>
                <div className="flex flex-wrap gap-1.5">
                  {draftTags.map((t) => (
                    <Badge key={t} variant="secondary" className="gap-1">
                      {t}
                      <button
                        className="cursor-pointer opacity-60 hover:opacity-100"
                        onClick={() => setDraftTags(draftTags.filter((x) => x !== t))}
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    placeholder="タグを入力して Enter"
                    className="h-8"
                  />
                  <Button variant="outline" size="sm" onClick={addTag}>
                    <Plus className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : record ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <StatusChip module={m} status={record.status} />
                {record.archived === 1 && <Badge variant="outline">アーカイブ済み</Badge>}
                {record.tags.map((t) => (
                  <Badge key={t} variant="secondary">
                    {t}
                  </Badge>
                ))}
              </div>

              {scoreResult && (
                <div className="bg-accent/50 space-y-2 rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">スコア</span>
                    <ScoreBar score={scoreResult.score} className="max-w-[160px]" />
                  </div>
                  {scoreResult.breakdown && (
                    <div className="space-y-1">
                      {scoreResult.breakdown.map((b) => (
                        <div key={b.label} className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground w-24 shrink-0">{b.label}</span>
                          <span className="bg-muted h-1 flex-1 overflow-hidden rounded-full">
                            <span
                              className="bg-primary/60 block h-full rounded-full"
                              style={{ width: `${(b.value / b.max) * 100}%` }}
                            />
                          </span>
                          <span className="tabular w-12 shrink-0 text-right">
                            {b.value} / {b.max}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <dl className="space-y-3">
                {fields.map((f) => (
                  <div key={f.key} className="grid grid-cols-[110px_1fr] gap-2 text-sm">
                    <dt className="text-muted-foreground pt-0.5 text-xs">{f.label}</dt>
                    <dd className="min-w-0 break-words whitespace-pre-wrap">
                      <FieldValue field={f} value={record.data[f.key]} truncate={false} />
                    </dd>
                  </div>
                ))}
              </dl>

              <Separator />
              <div className="text-muted-foreground space-y-1 text-xs">
                <div>作成: {formatDateTime(record.createdAt)}</div>
                <div>更新: {formatDateTime(record.updatedAt)}</div>
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground py-10 text-center text-sm">
              レコードが見つかりません（削除された可能性があります）
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 border-t p-3">
          {editing ? (
            <>
              <Button className="flex-1" onClick={() => void save()}>
                保存
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  drawer.mode === 'create'
                    ? closeDrawer()
                    : openDrawer({ mode: 'view', recordId: drawer.recordId })
                }
              >
                キャンセル
              </Button>
            </>
          ) : record ? (
            <>
              <Button
                className="flex-1"
                onClick={() => openDrawer({ mode: 'edit', recordId: record.id })}
              >
                <Pencil className="size-4" />
                編集
              </Button>
              <Button variant="outline" size="icon" title="複製" onClick={() => void duplicateRecords([record.id])}>
                <Copy />
              </Button>
              <Button
                variant="outline"
                size="icon"
                title={record.archived ? 'アーカイブ解除' : 'アーカイブ'}
                onClick={() => void setArchived([record.id], record.archived === 0)}
              >
                {record.archived ? <ArchiveRestore /> : <Archive />}
              </Button>
              <Button variant="outline" size="icon" title="削除" onClick={() => void remove()}>
                <Trash2 className="text-destructive" />
              </Button>
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
