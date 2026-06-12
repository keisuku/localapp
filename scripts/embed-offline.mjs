// オフライン単一HTML版を通常ビルドの dist/ に同梱する。
// アプリ内の「オフライン版をダウンロード」ボタンはこのファイルを指す。
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';

const src = 'dist-offline/index.html';
const dest = 'dist/local-app-studio-offline.html';

if (!existsSync(src)) {
  console.error(`[embed-offline] ${src} が見つかりません。先に build:offline を実行してください。`);
  process.exit(1);
}
mkdirSync('dist', { recursive: true });
copyFileSync(src, dest);
console.log(`[embed-offline] ${dest} を生成しました。`);
