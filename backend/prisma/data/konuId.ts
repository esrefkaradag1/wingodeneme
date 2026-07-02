import { createHash } from 'node:crypto';

export function konuIdStable(parts: (string | null | undefined)[]): string {
  const s = parts.map((p) => (p ?? '').trim()).join('|');
  return 'k_' + createHash('sha256').update(s, 'utf8').digest('hex').slice(0, 26);
}
