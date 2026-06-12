const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/** 衝突を実用上無視できる 21 文字のランダム ID（nanoid 互換形式） */
export function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(21));
  let id = '';
  for (const b of bytes) id += ALPHABET[b % ALPHABET.length];
  return id;
}
