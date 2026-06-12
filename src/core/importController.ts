/**
 * 「ファイルを選択して取り込む」をどこからでも呼べるようにする小さなレジストリ。
 * DropZone がファイル入力を保持し、ここに opener を登録する。
 */
let opener: (() => void) | null = null;

export function registerFilePicker(fn: () => void): void {
  opener = fn;
}

export function openFilePicker(): void {
  opener?.();
}
