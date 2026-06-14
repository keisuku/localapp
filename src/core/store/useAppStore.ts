import { create } from 'zustand';
import type { FilterCondition } from '@/core/types/record';
import type { ParsedTable } from '@/core/types/import';
import { moduleRegistry } from '@/modules';

export type ViewName = 'dashboard' | 'table' | 'card' | 'kanban';
export type Route =
  | { kind: 'module'; moduleId: string; view: ViewName }
  | { kind: 'settings' }
  | { kind: 'compare' };

export interface DrawerState {
  mode: 'view' | 'edit' | 'create';
  recordId: string | null;
}

interface AppState {
  route: Route;
  search: string;
  conditions: FilterCondition[];
  showArchived: boolean;
  filterPanelOpen: boolean;
  selection: string[];
  drawer: DrawerState | null;
  paletteOpen: boolean;
  shortcutsOpen: boolean;
  wizardTable: ParsedTable | null;
  /** テーブルのキーボード操作で注目中の行 */
  focusedRecordId: string | null;

  navigate: (route: Route) => void;
  setView: (view: ViewName) => void;
  setSearch: (s: string) => void;
  setConditions: (c: FilterCondition[]) => void;
  setShowArchived: (v: boolean) => void;
  toggleFilterPanel: () => void;
  setSelection: (ids: string[]) => void;
  toggleSelect: (id: string) => void;
  clearSelection: () => void;
  openDrawer: (d: DrawerState) => void;
  closeDrawer: () => void;
  setPaletteOpen: (v: boolean) => void;
  setShortcutsOpen: (v: boolean) => void;
  openWizard: (t: ParsedTable) => void;
  closeWizard: () => void;
  setFocusedRecordId: (id: string | null) => void;
}

const firstModuleId = moduleRegistry[0]?.id ?? 'generic';

export const useAppStore = create<AppState>((set) => ({
  route: { kind: 'module', moduleId: firstModuleId, view: 'dashboard' },
  search: '',
  conditions: [],
  showArchived: false,
  filterPanelOpen: false,
  selection: [],
  drawer: null,
  paletteOpen: false,
  shortcutsOpen: false,
  wizardTable: null,
  focusedRecordId: null,

  navigate: (route) =>
    set((s) => {
      const sameModule =
        route.kind === 'module' &&
        s.route.kind === 'module' &&
        route.moduleId === s.route.moduleId;
      return {
        route,
        // モジュールを跨いだら検索・フィルター・選択をリセット
        ...(sameModule
          ? {}
          : {
              search: '',
              conditions: [],
              selection: [],
              focusedRecordId: null,
              filterPanelOpen: false,
              drawer: null,
            }),
      };
    }),
  setView: (view) =>
    set((s) =>
      s.route.kind === 'module' ? { route: { ...s.route, view } } : {},
    ),
  setSearch: (search) => set({ search }),
  setConditions: (conditions) => set({ conditions }),
  setShowArchived: (showArchived) => set({ showArchived }),
  toggleFilterPanel: () => set((s) => ({ filterPanelOpen: !s.filterPanelOpen })),
  setSelection: (selection) => set({ selection }),
  toggleSelect: (id) =>
    set((s) => ({
      selection: s.selection.includes(id)
        ? s.selection.filter((x) => x !== id)
        : [...s.selection, id],
    })),
  clearSelection: () => set({ selection: [] }),
  openDrawer: (drawer) => set({ drawer }),
  closeDrawer: () => set({ drawer: null }),
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  setShortcutsOpen: (shortcutsOpen) => set({ shortcutsOpen }),
  openWizard: (wizardTable) => set({ wizardTable }),
  closeWizard: () => set({ wizardTable: null }),
  setFocusedRecordId: (focusedRecordId) => set({ focusedRecordId }),
}));

export function currentModuleId(route: Route): string | null {
  return route.kind === 'module' ? route.moduleId : null;
}
