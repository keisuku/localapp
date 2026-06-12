import type { ModuleDefinition } from '@/core/types/module';

// modules/<id>/index.ts を置くだけで自動登録される（コア側の修正は不要）
const mods = import.meta.glob<{ default: ModuleDefinition }>('./*/index.ts', {
  eager: true,
});

export const moduleRegistry: ModuleDefinition[] = Object.values(mods)
  .map((m) => m.default)
  .filter(Boolean)
  .sort((a, b) => a.id.localeCompare(b.id));

export function getModule(id: string): ModuleDefinition | undefined {
  return moduleRegistry.find((m) => m.id === id);
}
