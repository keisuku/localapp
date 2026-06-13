import { useEffect } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { StatusBar } from '@/components/layout/StatusBar';
import { CommandPalette } from '@/components/layout/CommandPalette';
import { ViewContainer } from '@/components/views/ViewContainer';
import { SettingsView } from '@/components/settings/SettingsView';
import { DataToolsView } from '@/components/tools/DataToolsView';
import { DetailDrawer } from '@/components/record/DetailDrawer';
import { DropZone } from '@/components/import/DropZone';
import { ImportWizard } from '@/components/import/ImportWizard';
import { ConfirmDialogHost } from '@/components/common/ConfirmDialogHost';
import { ShortcutsDialog } from '@/components/common/ShortcutsDialog';
import { Onboarding } from '@/components/common/Onboarding';
import { useAppStore } from '@/core/store/useAppStore';
import { undoManager } from '@/core/undo/undoManager';
import { openFilePicker } from '@/core/importController';

export default function App() {
  const route = useAppStore((s) => s.route);

  // グローバルショートカット
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const { setPaletteOpen, paletteOpen, setShortcutsOpen, clearSelection, selection } =
        useAppStore.getState();

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(!paletteOpen);
        return;
      }

      const target = e.target as HTMLElement | null;
      const inEditable = !!target?.closest('input, textarea, select, [contenteditable]');

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !inEditable) {
        e.preventDefault();
        void undoManager.undoLast();
        return;
      }
      if (e.key === '?' && !inEditable) {
        e.preventDefault();
        setShortcutsOpen(true);
        return;
      }
      if (e.key === 'Escape' && !inEditable && selection.length > 0) {
        clearSelection();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <TooltipProvider>
      <DropZone>
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          {route.kind === 'settings' ? (
            <div className="min-h-0 flex-1">
              <SettingsView />
            </div>
          ) : route.kind === 'tools' ? (
            <DataToolsView />
          ) : (
            <ViewContainer />
          )}
          <StatusBar />
        </div>

        <DetailDrawer />
        <CommandPalette />
        <ImportWizard />
        <ConfirmDialogHost />
        <ShortcutsDialog />
        <Onboarding onImportFile={openFilePicker} />
        <Toaster />
      </DropZone>
    </TooltipProvider>
  );
}
