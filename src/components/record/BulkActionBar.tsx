import { useState } from 'react';
import { Archive, Copy, Pencil, Tag, Trash2, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppStore } from '@/core/store/useAppStore';
import { useVisibleRecords } from '@/hooks/useVisibleRecords';
import {
  addTags,
  bulkPatchData,
  deleteRecords,
  duplicateRecords,
  setArchived,
  setStatus,
} from '@/core/db/mutations';
import { confirmDialog } from '@/core/store/confirmStore';
import { FieldInput } from './RecordForm';
import type { FieldDef } from '@/core/types/module';

/** 行選択時に画面下へ浮かぶ一括操作バー */
export function BulkActionBar() {
  const selection = useAppStore((s) => s.selection);
  const clearSelection = useAppStore((s) => s.clearSelection);
  const { module, fields } = useVisibleRecords();

  const [tagText, setTagText] = useState('');
  const [tagOpen, setTagOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editFieldKey, setEditFieldKey] = useState<string>('');
  const [editValue, setEditValue] = useState<unknown>(undefined);

  if (selection.length === 0 || !module) return null;

  const editableFields = fields.filter((f) => f.type !== 'longtext');
  const editField: FieldDef | undefined = editableFields.find((f) => f.key === editFieldKey);

  const doDelete = async () => {
    const ok = await confirmDialog({
      title: `${selection.length}件を削除しますか？`,
      description: '削除後もトーストの「元に戻す」で復元できます。',
      confirmLabel: '削除する',
      destructive: true,
    });
    if (!ok) return;
    const ids = [...selection];
    clearSelection();
    await deleteRecords(ids);
  };

  const applyBulkEdit = async () => {
    if (!editField) return;
    await bulkPatchData([...selection], { [editField.key]: editValue });
    setEditOpen(false);
    setEditFieldKey('');
    setEditValue(undefined);
  };

  return (
    <>
      <div className="absolute bottom-10 left-1/2 z-40 -translate-x-1/2">
        <div className="bg-primary text-primary-foreground flex items-center gap-1 rounded-xl px-3 py-2 shadow-xl">
          <span className="tabular px-1 text-sm font-semibold">{selection.length}件を選択中</span>
          <div className="bg-primary-foreground/20 mx-1 h-5 w-px" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="hover:bg-primary-foreground/15 hover:text-primary-foreground">
                ステータス
                <ChevronDown className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" side="top">
              {module.statuses.map((s) => (
                <DropdownMenuItem
                  key={s.value}
                  onClick={() => void setStatus([...selection], s.value)}
                >
                  <span className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Popover open={tagOpen} onOpenChange={setTagOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="hover:bg-primary-foreground/15 hover:text-primary-foreground">
                <Tag className="size-4" />
                タグ
              </Button>
            </PopoverTrigger>
            <PopoverContent side="top" className="w-64 p-3">
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const tags = tagText
                    .split(/[,、]/)
                    .map((s) => s.trim())
                    .filter(Boolean);
                  if (tags.length > 0) void addTags([...selection], tags);
                  setTagText('');
                  setTagOpen(false);
                }}
              >
                <Input
                  value={tagText}
                  onChange={(e) => setTagText(e.target.value)}
                  placeholder="タグ（カンマ区切り）"
                  className="h-8"
                  autoFocus
                />
                <Button type="submit" size="sm">
                  追加
                </Button>
              </form>
            </PopoverContent>
          </Popover>

          <Button
            variant="ghost"
            size="sm"
            className="hover:bg-primary-foreground/15 hover:text-primary-foreground"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="size-4" />
            一括編集
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="hover:bg-primary-foreground/15 hover:text-primary-foreground"
            onClick={() => {
              const ids = [...selection];
              clearSelection();
              void duplicateRecords(ids);
            }}
          >
            <Copy className="size-4" />
            複製
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="hover:bg-primary-foreground/15 hover:text-primary-foreground"
            onClick={() => {
              const ids = [...selection];
              clearSelection();
              void setArchived(ids, true);
            }}
          >
            <Archive className="size-4" />
            アーカイブ
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="hover:bg-primary-foreground/15 hover:text-primary-foreground"
            onClick={() => void doDelete()}
          >
            <Trash2 className="size-4" />
            削除
          </Button>

          <div className="bg-primary-foreground/20 mx-1 h-5 w-px" />
          <Button
            variant="ghost"
            size="iconSm"
            className="hover:bg-primary-foreground/15 hover:text-primary-foreground"
            onClick={clearSelection}
            title="選択解除（Esc）"
          >
            <X />
          </Button>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selection.length}件を一括編集</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="text-muted-foreground text-xs font-medium">変更する項目</div>
              <Select
                value={editFieldKey || undefined}
                onValueChange={(v) => {
                  setEditFieldKey(v);
                  setEditValue(undefined);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="項目を選択" />
                </SelectTrigger>
                <SelectContent>
                  {editableFields.map((f) => (
                    <SelectItem key={f.key} value={f.key}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {editField && (
              <div className="space-y-1.5">
                <div className="text-muted-foreground text-xs font-medium">
                  新しい値（空欄にするとクリア）
                </div>
                <FieldInput field={editField} value={editValue} onChange={setEditValue} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              キャンセル
            </Button>
            <Button disabled={!editField} onClick={() => void applyBulkEdit()}>
              {selection.length}件に適用
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
