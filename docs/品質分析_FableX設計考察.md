# Local App Studio 品質分析・維持ガイド

> このドキュメントは、本リポジトリ（**Local App Studio**）の「何がどう優れているのか」を
> 美しい**見た目・動作・設計**の観点から徹底的に言語化し、あわせて**今後も同等の品質を維持する**ための
> 実践的な指針をまとめたものです。
>
> 目的は2つ。
> 1. この成果物の価値を、後から読んでも再現できる言葉として残すこと。
> 2. 改修・拡張時に「再現性高くできる点」と「真似が難しい点」を区別し、品質を落とさず手を入れられるようにすること。
>
> 対象読者：このリポジトリを引き継ぐ開発者、レビュー担当者、そして将来このコードに変更を加えるAIエージェント。

---

## 0. 結論（先に要点）

このアプリの「凄さ」は、派手な機能ではなく**一貫性の密度**にあります。
色・余白・角丸・アニメーション・書き込み経路・拡張方法――それぞれの判断が**一つの設計思想に沿って全ファイルで揃っている**。
個々のテクニック（OKLCH、Undo、プラグイン式モジュール等）は単体では珍しくありませんが、それらが**例外なく**適用され、互いに噛み合っている点が突出しています。

- **見た目の美しさ** = OKLCH トークン体系 + 和文業務タイポ + 密度変数 による「設計された統一感」。
- **動作の美しさ** = Undo を第一級市民に据えた書き込み一元化 + Radix 由来の節度あるアニメ + live query の即時反映。
- **設計の美しさ** = `import.meta.glob` による真のプラグイン式 + 宣言的モジュール定義 + 書き込みボトルネック。

→ **再現しやすいのは「パターン」**（後述 §6）。**真似が難しいのは「どこで線を引くかの判断」**（後述 §7）。

---

## 1. このアプリの一言まとめ

**サーバー不要・完全ローカル・プラグイン式の業務アプリ基盤**。
Excel/CSV/JSON をドラッグ&ドロップで取り込み、データはすべてブラウザ内（IndexedDB）に保存。外部通信ゼロ。
`src/modules/` にフォルダを1つ追加するだけで新しい業務アプリ（求人比較・保険案件・在庫管理…）が増える設計。
配布形態は「ローカル開発サーバー / GitHub Pages / 単一オフライン HTML / PWA」の4通り。

技術スタック：React 19 + TypeScript(strict) + Vite + Tailwind v4 + shadcn/ui(Radix) + Zustand + Dexie(IndexedDB) + TanStack Table/Virtual。

---

## 2. 美しい「見た目」の正体

見た目の良さは感覚ではなく、**数値で管理された設計の結果**です。根拠は `src/index.css` に集約されています。

### 2.1 OKLCH による知覚的に均一な配色
色は全て **OKLCH 色空間**で定義されています（`src/index.css`）。

```css
--background: oklch(0.985 0.002 247);
--foreground: oklch(0.24 0.035 257);
--primary:    oklch(0.34 0.07 257);
--ring:       oklch(0.55 0.13 255);
```

ポイントは **L（明度）を直接コントロールできる**こと。
「白背景 × ネイビー/ブルー/グレー基調」という業務トーンを、色相（247〜257付近）をほぼ固定し、
明度と彩度だけを動かして作っている。だから濃淡を変えても色味がブレず、**画面全体が同じ"血筋"の色**で統一される。
ライト / ダーク / サイドバーで別々にトークンを定義し、ダークモードでも `--primary: oklch(0.68 0.12 252)` のように
明度を上げてコントラストを保っている（見た目の破綻が起きない理由）。

### 2.2 和文業務アプリならではのタイポグラフィ配慮
```css
--font-sans: 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', ... ;
body { font-feature-settings: 'palt'; }   /* 和文の詰め組み */
.tabular { font-variant-numeric: tabular-nums; } /* 数値を等幅で桁揃え */
```
- 和文フォントを**先頭**に置き、システムフォントへフォールバック。
- `palt` で日本語の字間を自然に詰める。
- `.tabular` で**数値カラムの桁を揃える**――業務データ表で効く、地味だが本質的な配慮。

### 2.3 密度（行間）をトークンで一括切替
```css
:root        { --row-py: 0.5rem;  --cell-px: 0.75rem; } /* コンフォート */
.density-compact { --row-py: 0.22rem; --cell-px: 0.55rem; } /* コンパクト */
```
行の高さやセル余白を**ハードコードせず CSS 変数**にしてあるので、`.density-compact` を付けるだけで
全テーブルの密度が切り替わる。各コンポーネントは `var(--row-py)` を参照するだけでよい。

### 2.4 角丸・影・フォーカスリングの体系化
- 角丸は `--radius: 0.5rem` を基準に `sm/md/lg/xl` を `calc()` で派生（`src/index.css`）。バラバラの角丸が存在しない。
- 影は `shadow-xs` 中心の**最小限の浮き**。重さを出さず階層だけを表現。
- フォーカスは全コンポーネントで `focus-visible:ring-[3px] ring-ring/50` に統一。**見えるが刺さらない**リング。

### 2.5 動的配色の小技
- スクロールバーは `color-mix(in oklab, var(--muted-foreground) 28%, transparent)` で背景に溶ける。
- `ScoreBar`（`src/components/common/ScoreBar.tsx`）はスコア0–100を**連続配色**：
  ```ts
  const color = `hsl(${215} ${30 + clamped * 0.6}% ${62 - clamped * 0.22}%)`;
  ```
  低スコア=グレー、高スコア=ネイビーへ滑らかに変化。色相を215°に固定し、彩度・明度だけ動かすので業務トーンを外さない。
- ステータスチップ等はモジュール定義の色を `color-mix(... 10%, transparent)`（薄い背景）/ `35%`（枠線）で展開し、テーマと馴染ませる。

---

## 3. 美しい「動作」の正体

「触り心地の良さ」は、**取り消せる安心感**と**節度あるアニメーション**と**即時反映**の合わせ技です。

### 3.1 Undo を第一級市民に据えた書き込み（最重要）
`src/core/db/mutations.ts` 冒頭のコメントが思想を端的に示しています。

> UI からの書き込みはすべてこのファイルの関数を経由する。
> 各関数は書き込み前に逆操作を捕捉して Undo トーストを表示し、完了時に lastSavedAt を更新する。

全ての mutation（作成・更新・削除・複製・アーカイブ・ステータス変更・タグ・一括編集・取り込み・初期化…）が
**直前の状態をスナップショットし、逆操作を登録**してから書き込む。例：

```ts
export async function deleteRecords(ids: string[]): Promise<void> {
  const snapshot = (await db.records.bulkGet(ids)).filter((r): r is AppRecord => !!r);
  if (snapshot.length === 0) return;
  await db.records.bulkDelete(ids);
  await touchSaved();
  pushUndoWithToast(`${snapshot.length}件を削除しました`, async () => {
    await db.records.bulkAdd(snapshot);   // ← 逆操作
    await touchSaved();
  });
}
```

この一貫性が「何をしても元に戻せる」という安心感＝**動作の美しさ**を生んでいる。
複数テーブルにまたがる操作（取り込み・初期化・バックアップ復元）は `db.transaction('rw', ...)` で**原子的**に行い、
逆操作も同じくトランザクションで囲む。中途半端な状態が残らない。

### 3.2 保存表示は副作用ではなく約束
全 mutation が完了時に `touchSaved()` を呼び、ステータスバーの「最終保存」表示を更新する。
ユーザーは保存ボタンを押さない（自動保存）が、**保存された事実は必ず可視化される**。

### 3.3 即時反映（Dexie live query）
読み取りは `dexie-react-hooks` の `useLiveQuery` を使い、DB が変われば UI が自動再描画。
複合インデックス `[moduleId+archived]` を使った絞り込み（`src/core/db/queries.ts`）で、
書き込み → 画面反映の往復が速く、引っかかりがない。

### 3.4 節度あるアニメーション
Radix UI + `tw-animate-css` により、ダイアログは `zoom-in-95 + fade-in`、
サイドシート（DetailDrawer）は `slide-in-from-right`（開く時 400ms / 閉じる時 300ms と非対称）。
**開くときはゆっくり、閉じるときは素早く**という体感設計。ホバーではカードが `shadow-xs → shadow-md` に
わずかに浮き、星評価は `hover:scale-110`。どれも**主張しすぎない**。

---

## 4. 美しい「設計」の正体

### 4.1 真のプラグイン式モジュール
`src/modules/index.ts`：

```ts
const mods = import.meta.glob<{ default: ModuleDefinition }>('./*/index.ts', { eager: true });
export const moduleRegistry = Object.values(mods).map((m) => m.default).filter(Boolean)
  .sort((a, b) => a.id.localeCompare(b.id));
```

`src/modules/` にフォルダを置けば**コア無改修で自動登録**される。求人・保険・汎用が同じ仕組みの上に乗る。
新業務アプリの追加コスト＝フォルダ1つ。

### 4.2 宣言的なモジュール定義
モジュールは「コード」ではなく「データ」として自分を記述する：
`schema.ts`（フィールド定義・別名・最小最大）/ `views.ts`（4ビュー設定）/ `labels.ts`（表示名・アイコン）/ `scoring.ts`（任意の採点）。
型は `src/core/types/module.ts` の `ModuleDefinition`。UI はこの構造を読んで**動的にレンダリング**する。
スコアリングは純粋関数で、UI 側で常に内訳（breakdown）を表示できる＝**採点が透明**。

### 4.3 書き込みのボトルネック化
§3.1 の通り、書き込み口を `mutations.ts` に**意図的に一本化**。
これにより「Undo 捕捉」「保存表示」「`sanitizeData` によるプロトタイプ汚染対策」が**漏れなく**かかる。
横断的関心事を一箇所に集約する、王道だが徹底された設計。

### 4.4 賢い取り込みパイプライン
取り込みは段階的で、各段が単一責務：
- `parseFile.ts`：UTF-8 で読み、失敗したら Shift_JIS にフォールバック（Excel 出力の和文CSV対策）。
- `inferColumns.ts`：サンプル値の統計から型推定。
  ```ts
  if (dates / samples.length >= 0.8) return 'date';
  if (numeric / samples.length >= 0.9)
    return currencyLike / samples.length >= 0.5 ? 'currency' : 'number';
  // 種類が少なく繰り返しが多ければ選択肢
  if (samples.length >= 5 && distinct <= 8 && distinct < samples.length / 2) return 'select';
  ```
- `matchModule.ts`：フィールドの**別名（aliases）と類似度**でヘッダを自動対応（「年収」「給与」→ `salary`）。
- `validate.ts`：必須空 / ファイル内重複 / DB重複 / 異常値 を**別々の Set に分類**し、UI で**種類ごとに選択スキップ**できる。

### 4.5 型安全とセキュリティ
- `tsconfig.app.json` は `strict` に加え `noUnusedLocals / noUnusedParameters / noFallthroughCasesInSwitch` 等を有効化。
- 型ガード（`(r): r is AppRecord => !!r`）でヌルを安全に除去。
- `sanitizeData()` が `__proto__ / constructor / prototype` を除去。CSV 出力時は先頭 `= + - @` をエスケープ（CSVインジェクション対策）。

### 4.6 型に応じたフィルタ（細部の気配り）
`src/core/search/filterRecords.ts` の `opsForField` は、フィールド型ごとに**意味のある演算子だけ**を返す：
数値/通貨/評価には `gte/lte/gt/lt`、選択/真偽には `equals/notEquals`、日付には範囲比較。
`evaluateCondition` は数値化できない日付を `Date.parse` で**タイムスタンプ比較にフォールバック**する多態的な実装。
検索は `searchMatch` がスペース区切りの**AND 検索**（各語が data 全値・タグ・ステータスのどこかに含まれる）。

---

## 5. 「再現可能」と「真似が難しい」の見取り図

| 観点 | 再現しやすい（§6） | 真似が難しい（§7） |
| --- | --- | --- |
| 見た目 | OKLCHトークン表・密度変数・角丸/影/リングの規約 | どの値を変数化し、どの色相に寄せるかの**判断** |
| 動作 | Undo一元化パターン・トースト・live query | 「Undoを設計の軸に据える」という**最初の決断** |
| 設計 | `import.meta.glob` 自動登録・宣言的定義 | 過不足ない抽象度と**スコープの線引き** |
| 全体 | 個々のテクニックの移植 | **全ファイルで例外を作らない一貫性** |

---

## 6. Opus 4.8 で再現性高くできる点（パターンの模倣が効く領域）

以下は「型」が明確なので、踏襲すれば高い再現性で同等品質を出せます。各項目に**真似方**を添えます。

1. **OKLCH トークン体系の踏襲**
   真似方：`src/index.css` の `:root` / `.dark` / サイドバー変数をそのまま土台にし、新色も**必ず `oklch()` でトークン追加**。直値の色をコンポーネントに書かない。

2. **密度・角丸・影・フォーカスの規約**
   真似方：余白は `var(--row-py)/var(--cell-px)`、角丸は `rounded-md/lg/xl`、フォーカスは `focus-visible:ring-[3px] ring-ring/50`。既存コンポーネントからコピーして揃える。

3. **shadcn/ui + Radix + CVA 構成**
   真似方：`src/components/ui/` の既存プリミティブを再利用。バリアントは CVA で定義し、新規 UI も同じ書式に合わせる。アニメは Radix の `data-[state=...]` + `tw-animate-css` を流用。

4. **書き込みは `mutations.ts` 経由＋Undo捕捉**
   真似方：新しい書き込みを足すときは `deleteRecords` 等を**テンプレートにコピー**し、`snapshot →（変更）→ touchSaved → pushUndoWithToast(逆操作)` の順序を守る。UI から `db.records` を直接触らない。

5. **宣言的モジュールの追加（横展開）**
   真似方：`src/modules/generic/` を雛形に新フォルダを作り、`schema/views/labels/(scoring)/index` を埋めるだけ。`import.meta.glob` が自動登録するのでコアは触らない。

6. **取り込みの型推定・別名・検証の拡張**
   真似方：新フィールドには `aliases` と `min/max` を付ける。型推定の閾値や検証カテゴリは `inferColumns.ts` / `validate.ts` の既存形に倣う。

7. **型に応じた演算子・AND検索**
   真似方：新フィールド型を足したら `opsForField` に分岐を追加し、`evaluateCondition` の多態に倣う。

8. **strict TypeScript と型ガード**
   真似方：`strict` 設定を緩めない。`filter((x): x is T => !!x)` 等の既存イディオムを踏襲。

> これらは**「既存の形に合わせる」だけで再現できる**。新規発明は不要で、Opus 4.8 が最も得意とする領域です。

---

## 7. 真似が難しい点（センス＝判断が要る領域）

パターンは移植できても、**「どこで線を引くか」という判断**は機械的には出てきません。ここが Fable の真価です。

1. **何を変数化し、何を固定するかの判断**
   行密度や角丸を変数化し、色相をほぼ固定して明度だけ動かす――この「抽象化の粒度」は経験則。
   緩和策：迷ったら**既存トークンの粒度に合わせる**。新しい軸の変数を増やす前に、既存変数で表現できないか考える。

2. **Undo を設計の軸に据えるという最初の決断**
   「全書き込みに逆操作を持たせる」は、後付けでは破綻しやすい。最初から土台に置いたからこそ全mutationで成立している。
   緩和策：この軸を**絶対に崩さない**。新機能でも「逆操作は何か」を先に決めてから実装する。

3. **過不足ない抽象度**
   モジュールを「データ（宣言）」として記述し、UIが解釈する設計は、抽象化しすぎても足りなくても破綻する。今の `ModuleDefinition` は**ちょうど良い**。
   緩和策：`ModuleDefinition` に項目を足したくなったら、**本当に複数モジュールで共有する概念か**を問う。1モジュール固有なら `data` 側に置く。

4. **和文業務文脈の機微**
   `palt`・`tabular-nums`・Shift_JIS フォールバック・「年収/給与」の別名・「○/有」を真偽に変換――これらは**ドメイン理解**から来る。
   緩和策：和文業務データの実物（Excel出力のクセ）を念頭に、推測ではなく**実データで**検証する。

5. **捨てる勇気＝スコープの線引き**
   PC前提・最新ブラウザ前提・サーバーなし、と**割り切った**からこの単純さと完成度がある。何でも対応しないことが品質を支えている。
   緩和策：「対応範囲を広げる」変更は、それが**全体の単純さを壊さないか**を最優先で検討する。

6. **全ファイルで例外を作らない一貫性**
   最も真似が難しいのはこれ。1ファイルだけ規約を外すと、そこから崩れる。
   緩和策：§8 のチェックリストをレビュー基準にする。

---

## 8. 品質を維持するための実践チェックリスト

改修・レビュー時に以下を確認する。**1つでも外れたら、それは品質低下の兆候**。

### 見た目
- [ ] 色を**直値で書いていない**。必ず `oklch()` トークン（`src/index.css`）経由で、ライト/ダーク両方を定義した。
- [ ] 余白・行密度は `var(--row-py)/var(--cell-px)`、角丸は `rounded-md/lg/xl`、フォーカスは `ring-[3px] ring-ring/50` に揃えた。
- [ ] 影は最小限（`shadow-xs` 基調）。重い影を足していない。
- [ ] 数値表示に `.tabular` を使った。新ビューもダークモードで破綻しない。

### 動作
- [ ] **書き込みは必ず `src/core/db/mutations.ts` 経由**。UI から `db.records` を直接更新していない。
- [ ] 新しい mutation は**逆操作を捕捉**し `pushUndoWithToast` を呼ぶ。完了時に `touchSaved()` を呼ぶ。
- [ ] 複数テーブル更新は `db.transaction('rw', ...)` で原子的に。逆操作も同様。
- [ ] 読み取りは `useLiveQuery`。手動リフレッシュを書いていない。
- [ ] アニメは Radix の `data-[state]` + 既存の時間設計（開く>閉じる）に倣った。

### 設計
- [ ] 新業務アプリは `src/modules/<id>/` の追加のみ。**コアを改修していない**。
- [ ] 外部入力データは `sanitizeData()` を通る経路を使う。CSV 出力のエスケープを壊していない。
- [ ] 新フィールドに `aliases` と（必要なら）`min/max` を付け、`opsForField`/`evaluateCondition`/取り込み検証を更新した。
- [ ] `tsconfig` の `strict` 系を緩めていない。`any` で逃げず型ガードを使った。
- [ ] `ModuleDefinition` への追加は「複数モジュールで共有する概念」に限定した。

---

## 9. 正直な弱点と改善余地

「貴重なプログラム」を守るには、弱点も把握しておく必要があります。

- **自動テストが無い**：`*.test.ts` が存在しない。ただし `validateRows / filterRecords / evaluateCondition / scoring / inferColumns` は**純粋関数**で副作用が無く、テストしやすい。
  → 入れるならまずここから（Vitest 推奨。Vite 構成と相性が良い）。回帰防止の費用対効果が最も高い。
- **Undo はメモリ内・最大50件**：ページ再読込で消える。仕様上は妥当だが、その前提を変更時に壊さないこと。
- **JSDoc が薄い**：エクスポート関数のドキュメントは最小限。重要関数に意図を1行残すと引き継ぎが楽になる。
- **`React.memo` の余地**：一部ビューで再描画最適化の余地。ただし現状の体感は良好なので、**計測してから**入れる。

---

## 10. 付録：重要ファイル早見表

| 役割 | パス |
| --- | --- |
| デザイントークン（色/密度/角丸/タイポ） | `src/index.css` |
| 書き込み一元化＋Undo＋サニタイズ | `src/core/db/mutations.ts` |
| 読み取り（live query / 複合インデックス） | `src/core/db/queries.ts`, `src/core/db/db.ts` |
| Undo スタック（50件） | `src/core/undo/undoManager.ts` |
| モジュール自動登録 | `src/modules/index.ts` |
| モジュール型定義 | `src/core/types/module.ts` |
| モジュール雛形 | `src/modules/generic/`（`schema/views/labels/scoring/index`） |
| 取り込み：解析/型推定/対応付け/検証 | `src/core/import/{parseFile,inferColumns,matchModule,validate,commit}.ts` |
| 検索・フィルタ | `src/core/search/filterRecords.ts` |
| UI状態（Zustand） | `src/core/store/useAppStore.ts` |
| 合成フック（表示レコード） | `src/hooks/useVisibleRecords.ts` |
| スコア表示（動的配色の例） | `src/components/common/ScoreBar.tsx` |
| 4ビュー | `src/components/views/{Dashboard,Table,Card,Kanban}View.tsx` |
| UIプリミティブ（shadcn/ui） | `src/components/ui/` |

---

### 最後に

このコードベースの価値は「賢い1ファイル」ではなく、**全ファイルを貫く判断の一貫性**にあります。
新しいテクニックを足すより、**既存の形に合わせ続ける**ことが、このクオリティを維持する最短路です。
迷ったら本ドキュメントの §8 に立ち返ってください。
