export function calcProm(a: string, b: string): string {
  const va = parseFloat(a);
  const vb = parseFloat(b);
  if (isNaN(va) || isNaN(vb)) return '';
  return ((va + vb) / 2).toFixed(1);
}

export function monthlyAverage(values: string[]): string {
  const nums = values.map(v => parseFloat(v)).filter(v => !isNaN(v));
  if (nums.length === 0) return '';
  return (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1);
}

export function isOutOfRangeTemp10(val: string): boolean {
  const v = parseFloat(val);
  if (isNaN(v)) return false;
  return v > 30;
}

export function isOutOfRangeHum10(val: string): boolean {
  const v = parseFloat(val);
  if (isNaN(v)) return false;
  return v > 70;
}

export function isOutOfRangeTemp11(val: string): boolean {
  const v = parseFloat(val);
  if (isNaN(v)) return false;
  return v < 2 || v > 8;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}
