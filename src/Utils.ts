export function distance(ax: number, ay: number, bx: number, by: number): number {
  return Math.max(Math.abs(bx - ax), Math.abs(by - ay));
}

export function indefArticle(s: string): string {
  const first = s[0];
  if (first >= '0' && first <= '9') 
    return s;

  return 'aeiouAEIOUyY'.includes(first) ? `an ${s}` : `a ${s}`;
}
