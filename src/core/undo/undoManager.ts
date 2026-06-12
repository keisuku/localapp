import { toast } from 'sonner';

export interface UndoCommand {
  label: string;
  undo: () => Promise<void>;
}

const MAX_STACK = 50;
const stack: UndoCommand[] = [];

export const undoManager = {
  push(cmd: UndoCommand) {
    stack.push(cmd);
    if (stack.length > MAX_STACK) stack.shift();
  },

  canUndo(): boolean {
    return stack.length > 0;
  },

  peekLabel(): string | null {
    return stack.length > 0 ? stack[stack.length - 1].label : null;
  },

  async undoLast(): Promise<void> {
    const cmd = stack.pop();
    if (!cmd) return;
    try {
      await cmd.undo();
      toast.success(`元に戻しました：${cmd.label}`);
    } catch (e) {
      console.error(e);
      toast.error('元に戻す操作に失敗しました');
    }
  },
};

/** 操作完了トースト（Undo ボタン付き）を表示しつつ Undo スタックに積む */
export function pushUndoWithToast(label: string, undo: () => Promise<void>) {
  undoManager.push({ label, undo });
  toast.success(label, {
    action: {
      label: '元に戻す',
      onClick: () => void undoManager.undoLast(),
    },
  });
}
