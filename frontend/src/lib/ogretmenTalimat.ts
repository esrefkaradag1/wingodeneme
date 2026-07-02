/** Backend `OGRETMEN_TALIMAT_MAX` ile uyumlu */
export const OGRETMEN_TALIMAT_MAX = 3000;

export function ogretmenTalimatKalan(karakter: number): number {
  return Math.max(0, OGRETMEN_TALIMAT_MAX - karakter);
}
