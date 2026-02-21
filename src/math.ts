export function Cnk(n: number, k: number): number {
  if (n < k) return 0;
  if (k > Math.floor(n / 2)) k = n - k;
  let s = 1, i = n, j = 1;
  while (i !== n - k) { s *= i; s = Math.floor(s / j); i--; j++; }
  return s;
}

export function factorial(n: number): number {
  let f = 1;
  for (let i = 2; i <= n; i++) f *= i;
  return f;
}

export function rotateLeft(array: Int8Array, l: number, r: number): void {
  const tmp = array[l];
  for (let i = l; i < r; i++) array[i] = array[i + 1];
  array[r] = tmp;
}

export function rotateRight(array: Int8Array, l: number, r: number): void {
  const tmp = array[r];
  for (let i = r; i > l; i--) array[i] = array[i - 1];
  array[l] = tmp;
}
