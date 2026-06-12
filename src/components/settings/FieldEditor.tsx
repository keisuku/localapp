import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
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
import { useSettingValue } from '@/core/db/queries';
import { setSetting } from '@/core/db/db';
import { customFieldsKey, type CustomFieldDef } from '@/core/moduleUtils';
import { getModule } from '@/modules';
import type { FieldType } from '@/core/types/module';
import { toast } from 'sonner';

const TYPE_OPTIONS: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'テキスト' },
  { value: 'longtext', label: '長文テキスト' },
  { value: 'number', label: '数値' },
  { value: 'currency', label: '金額' },
  { value: 'date', label: '日付' },
  { value: 'select', label: '選択肢' },
  { value: 'boolean', label: 'はい/いいえ' },
  { value: 'url', label: 'URL' },
  { value: 'rating', label: '評価（星）' },
];

/** コードを書かずに項目を追加できるノーコード・フィールドエディタ */
export function FieldEditor({ moduleId }: { moduleId: string }) {
  const module = getModule(moduleId);
  const custom = useSettingValue<CustomFieldDef[]>(customFieldsKey(moduleId));
  const [label, setLabel] = useState('');
  const [type, setType] = useState<FieldType>('text');
  const [options, setOptions] = useState('');

  if (!module) return null;

  const save = (next: CustomFieldDef[]) => void setSetting(customFieldsKey(moduleId), next);

  const add = () => {
    const name = label.trim();
    if (!name) return;
    const existingKeys = new Set([
      ...module.fields.map((f) => f.key),
      ...(custom ?? []).map((f) => f.key),
    ]);
    let key = name;
    while (existingKeys.has(key)) key = `${key}_2`;
    const field: CustomFieldDef = {
      key,
      label: name,
      type,
      showInTable: true,
      ...(type === 'select' && options.trim()
        ? {
            options: options
              .split(/[,、]/)
              .map((s) => s.trim())
              .filter(Boolean)
              .map((v) => ({ value: v, label: v })),
          }
        : {}),
    };
    save([...(custom ?? []), field]);
    setLabel('');
    setOptions('');
    toast.success(`項目「${name}」を追加しました`);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        {module.fields.map((f) => (
          <div key={f.key} className="flex items-center gap-2 text-sm">
            <span className="flex-1">{f.label}</span>
            <Badge variant="outline" className="text-[10px]">
              {TYPE_OPTIONS.find((t) => t.value === f.type)?.label ?? f.type}
            </Badge>
            <Badge variant="secondary" className="text-[10px]">
              標準
            </Badge>
          </div>
        ))}
        {(custom ?? []).map((f) => (
          <div key={f.key} className="flex items-center gap-2 text-sm">
            <span className="flex-1">{f.label}</span>
            <Badge variant="outline" className="text-[10px]">
              {TYPE_OPTIONS.find((t) => t.value === f.type)?.label ?? f.type}
            </Badge>
            <Badge className="text-[10px]">カスタム</Badge>
            <Button
              variant="ghost"
              size="iconSm"
              onClick={() => {
                save((custom ?? []).filter((x) => x.key !== f.key));
                toast.success(`項目「${f.label}」を削除しました（データ自体は残ります）`);
              }}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}
      </div>

      <div className="space-y-2 rounded-lg border p-3">
        <div className="text-xs font-semibold">新しい項目を追加</div>
        <div className="flex gap-2">
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="項目名（例: 担当部署）"
            className="h-8 flex-1"
          />
          <Select value={type} onValueChange={(v) => setType(v as FieldType)}>
            <SelectTrigger size="sm" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {type === 'select' && (
          <Input
            value={options}
            onChange={(e) => setOptions(e.target.value)}
            placeholder="選択肢をカンマ区切りで入力（例: A案, B案, C案）"
            className="h-8"
          />
        )}
        <Button size="sm" onClick={add} disabled={!label.trim()}>
          <Plus className="size-4" />
          項目を追加
        </Button>
      </div>
    </div>
  );
}
