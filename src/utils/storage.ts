import { Anexo10Data, Anexo11Data, DailyEntry, RefrigDailyEntry, HeaderInfo, FooterInfo } from '../types';
import { daysInMonth } from './calculations';

function emptyHeader(): HeaderInfo {
  return {
    institucion: '',
    estrategia: '',
    establecimiento: '',
    direccion: '',
    noEquipo: '',
    anio: new Date().getFullYear().toString(),
    mes: (new Date().getMonth() + 1).toString().padStart(2, '0'),
  };
}

function emptyFooter(): FooterInfo {
  return { revisadoPor: '', cargo: '', fecha: '' };
}

function emptyEntries10(year: number, month: number): DailyEntry[] {
  const days = daysInMonth(year, month);
  return Array.from({ length: days }, (_, i) => ({
    dia: i + 1,
    tempManana: '',
    tempTarde: '',
    humManana: '',
    humTarde: '',
    nombre: '',
    observaciones: '',
  }));
}

function emptyEntries11(year: number, month: number): RefrigDailyEntry[] {
  const days = daysInMonth(year, month);
  return Array.from({ length: days }, (_, i) => ({
    dia: i + 1,
    tempManana: '',
    tempTarde: '',
    nombre: '',
    observaciones: '',
  }));
}

export function loadAnexo10(year: number, month: number): Anexo10Data {
  const key = `anexo10-${year}-${String(month).padStart(2, '0')}`;
  const raw = localStorage.getItem(key);
  if (raw) {
    try {
      return JSON.parse(raw) as Anexo10Data;
    } catch {
      // fall through
    }
  }
  return {
    header: { ...emptyHeader(), anio: year.toString(), mes: String(month).padStart(2, '0') },
    footer: emptyFooter(),
    entries: emptyEntries10(year, month),
  };
}

export function saveAnexo10(year: number, month: number, data: Anexo10Data): void {
  const key = `anexo10-${year}-${String(month).padStart(2, '0')}`;
  localStorage.setItem(key, JSON.stringify(data));
}

export function loadAnexo11(year: number, month: number): Anexo11Data {
  const key = `anexo11-${year}-${String(month).padStart(2, '0')}`;
  const raw = localStorage.getItem(key);
  if (raw) {
    try {
      return JSON.parse(raw) as Anexo11Data;
    } catch {
      // fall through
    }
  }
  return {
    header: { ...emptyHeader(), anio: year.toString(), mes: String(month).padStart(2, '0') },
    footer: emptyFooter(),
    entries: emptyEntries11(year, month),
  };
}

export function saveAnexo11(year: number, month: number, data: Anexo11Data): void {
  const key = `anexo11-${year}-${String(month).padStart(2, '0')}`;
  localStorage.setItem(key, JSON.stringify(data));
}

// ─── Locked days ──────────────────────────────────────────────────────────────

export function loadLockedDays(anexo: 'locked10' | 'locked11', year: number, month: number): Set<number> {
  const key = `${anexo}-${year}-${String(month).padStart(2, '0')}`;
  const raw = localStorage.getItem(key);
  if (raw) {
    try {
      const arr = JSON.parse(raw) as number[];
      return new Set(arr);
    } catch {
      // fall through
    }
  }
  return new Set();
}

export function saveLockedDays(anexo: 'locked10' | 'locked11', year: number, month: number, locked: Set<number>): void {
  const key = `${anexo}-${year}-${String(month).padStart(2, '0')}`;
  localStorage.setItem(key, JSON.stringify(Array.from(locked)));
}

// ─── Has data ─────────────────────────────────────────────────────────────────

export function hasDataForMonth(anexo: 'anexo10' | 'anexo11', year: number, month: number): boolean {
  const key = `${anexo}-${year}-${String(month).padStart(2, '0')}`;
  return localStorage.getItem(key) !== null;
}

// ─── Export / Import all data ─────────────────────────────────────────────────

export function exportAllData(): void {
  const result: Record<string, unknown> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          result[key] = JSON.parse(raw);
        } catch {
          result[key] = raw;
        }
      }
    }
  }
  const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `respaldo-rpis-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importAllData(file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as Record<string, unknown>;
        Object.entries(data).forEach(([key, value]) => {
          localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
        });
        resolve();
      } catch {
        reject(new Error('Archivo JSON inválido'));
      }
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsText(file);
  });
}

export { emptyEntries10, emptyEntries11 };
