const numberFmt = new Intl.NumberFormat('ja-JP');
const currencyFmt = new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
  maximumFractionDigits: 0,
});

export function formatNumber(v: unknown, unit?: string): string {
  const n = toNumber(v);
  if (n === null) return '';
  return numberFmt.format(n) + (unit ? ` ${unit}` : '');
}

export function formatCurrency(v: unknown, unit?: string): string {
  const n = toNumber(v);
  if (n === null) return '';
  if (unit) return `${numberFmt.format(n)} ${unit}`;
  return currencyFmt.format(n);
}

export function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = String(v).replace(/[¥￥,，\s]/g, '').replace(/円$/, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function formatDateTime(ts: number | undefined | null): string {
  if (!ts) return '';
  const d = new Date(ts);
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatTime(ts: number | undefined | null): string {
  if (!ts) return '';
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Date/Excel シリアル値/文字列を 'YYYY-MM-DD' に正規化。解釈不能なら null */
export function toDateString(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) return isoDate(v);
  if (typeof v === 'number' && v > 20000 && v < 80000) {
    // Excel シリアル値（1900-01-01 起点、うるう年バグ込み）
    const ms = Math.round((v - 25569) * 86400 * 1000);
    return isoDate(new Date(ms));
  }
  const s = String(v).trim();
  const m = s.match(/^(\d{4})[/\-年.](\d{1,2})[/\-月.](\d{1,2})日?$/);
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    if (!Number.isNaN(d.getTime())) return isoDate(d);
  }
  const d = new Date(s);
  if (!Number.isNaN(d.getTime()) && /\d{4}/.test(s)) return isoDate(d);
  return null;
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function formatDate(v: unknown): string {
  const s = toDateString(v);
  if (!s) return v == null ? '' : String(v);
  return s.replaceAll('-', '/');
}

/** 全角→半角・空白除去・小文字化（列名マッチング用） */
export function normalizeHeader(s: string): string {
  return s
    .normalize('NFKC')
    .replace(/[\s　_\-－()（）:：]/g, '')
    .toLowerCase();
}
