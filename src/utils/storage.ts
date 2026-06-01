import { Anexo10Data, Anexo11Data, DailyEntry, RefrigDailyEntry, HeaderInfo, FooterInfo, Termohigrometro, Usuario } from '../types';
import { daysInMonth } from './calculations';

function emptyHeader(year?: number, month?: number): HeaderInfo {
  return {
    institucion: '',
    estrategia: '',
    establecimiento: '',
    direccion: '',
    noEquipo: '',
    anio: (year ?? new Date().getFullYear()).toString(),
    mes: String(month ?? (new Date().getMonth() + 1)).padStart(2, '0'),
  };
}

function emptyFooter(): FooterInfo {
  return { revisadoPor: '', cargo: '', fecha: '' };
}

export function emptyEntries10(year: number, month: number): DailyEntry[] {
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

export function emptyEntries11(year: number, month: number): RefrigDailyEntry[] {
  const days = daysInMonth(year, month);
  return Array.from({ length: days }, (_, i) => ({
    dia: i + 1,
    tempManana: '',
    tempTarde: '',
    nombre: '',
    observaciones: '',
  }));
}

// ─── Termohigrómetros CRUD ────────────────────────────────────────────────────

export function loadTermos(): Termohigrometro[] {
  const raw = localStorage.getItem('termos');
  if (raw) {
    try {
      return JSON.parse(raw) as Termohigrometro[];
    } catch {
      // fall through
    }
  }
  return [];
}

export function saveTermos(termos: Termohigrometro[]): void {
  localStorage.setItem('termos', JSON.stringify(termos));
}

export function addTermo(termo: Termohigrometro): void {
  const termos = loadTermos();
  termos.push(termo);
  saveTermos(termos);
}

export function updateTermo(updated: Termohigrometro): void {
  const termos = loadTermos().map(t => t.id === updated.id ? updated : t);
  saveTermos(termos);
}

export function deleteTermo(id: string): void {
  const termos = loadTermos().filter(t => t.id !== id);
  saveTermos(termos);
}

// ─── Per-termo record keys ────────────────────────────────────────────────────

function recordKey(termoId: string, year: number, month: number): string {
  return `registro-${termoId}-${year}-${String(month).padStart(2, '0')}`;
}

function lockedKey(termoId: string, year: number, month: number): string {
  return `locked-${termoId}-${year}-${String(month).padStart(2, '0')}`;
}

// ─── Anexo 10 ─────────────────────────────────────────────────────────────────

export function loadAnexo10(year: number, month: number, termoId?: string): Anexo10Data {
  const key = termoId ? recordKey(termoId, year, month) : `anexo10-${year}-${String(month).padStart(2, '0')}`;
  const raw = localStorage.getItem(key);
  if (raw) {
    try {
      return JSON.parse(raw) as Anexo10Data;
    } catch {
      // fall through
    }
  }
  return {
    header: { ...emptyHeader(year, month) },
    footer: emptyFooter(),
    entries: emptyEntries10(year, month),
  };
}

export function saveAnexo10(year: number, month: number, data: Anexo10Data, termoId?: string): void {
  const key = termoId ? recordKey(termoId, year, month) : `anexo10-${year}-${String(month).padStart(2, '0')}`;
  localStorage.setItem(key, JSON.stringify(data));
}

// ─── Anexo 11 ─────────────────────────────────────────────────────────────────

export function loadAnexo11(year: number, month: number, termoId?: string): Anexo11Data {
  const key = termoId ? recordKey(termoId, year, month) : `anexo11-${year}-${String(month).padStart(2, '0')}`;
  const raw = localStorage.getItem(key);
  if (raw) {
    try {
      return JSON.parse(raw) as Anexo11Data;
    } catch {
      // fall through
    }
  }
  return {
    header: { ...emptyHeader(year, month) },
    footer: emptyFooter(),
    entries: emptyEntries11(year, month),
  };
}

export function saveAnexo11(year: number, month: number, data: Anexo11Data, termoId?: string): void {
  const key = termoId ? recordKey(termoId, year, month) : `anexo11-${year}-${String(month).padStart(2, '0')}`;
  localStorage.setItem(key, JSON.stringify(data));
}

// ─── Locked days ──────────────────────────────────────────────────────────────

export function loadLockedDays(termoId: string, year: number, month: number): Set<number> {
  const key = lockedKey(termoId, year, month);
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

export function saveLockedDays(termoId: string, year: number, month: number, locked: Set<number>): void {
  const key = lockedKey(termoId, year, month);
  localStorage.setItem(key, JSON.stringify(Array.from(locked)));
}

// ─── Has data ─────────────────────────────────────────────────────────────────

export function hasDataForMonth(termoId: string, year: number, month: number): boolean {
  const key = recordKey(termoId, year, month);
  return localStorage.getItem(key) !== null;
}

// ─── Get all months with data for a termo ─────────────────────────────────────

export function getMonthsWithData(termoId: string): { year: number; month: number }[] {
  const prefix = `registro-${termoId}-`;
  const result: { year: number; month: number }[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      const rest = key.slice(prefix.length); // e.g. "2025-03"
      const parts = rest.split('-');
      if (parts.length === 2) {
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]);
        if (!isNaN(year) && !isNaN(month)) {
          result.push({ year, month });
        }
      }
    }
  }
  return result.sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
}

// ─── Usuarios ─────────────────────────────────────────────────────────────────

export function loadUsuarios(): Usuario[] {
  const raw = localStorage.getItem('usuarios');
  if (raw) { try { return JSON.parse(raw) as Usuario[]; } catch { /* */ } }
  return [];
}

export function saveUsuarios(users: Usuario[]): void {
  localStorage.setItem('usuarios', JSON.stringify(users));
}

export function getSession(): Usuario | null {
  const raw = localStorage.getItem('session');
  if (raw) { try { return JSON.parse(raw) as Usuario; } catch { /* */ } }
  return null;
}

export function setSession(user: Usuario | null): void {
  if (user) localStorage.setItem('session', JSON.stringify(user));
  else localStorage.removeItem('session');
}

// Creates the default admin if no users exist
export function initAdminIfNeeded(): void {
  const users = loadUsuarios();
  if (users.length === 0) {
    const admin: Usuario = {
      id: '1',
      nombre: 'Administrador',
      usuario: 'admin',
      password: 'admin123',
      rol: 'admin',
      creadoEn: new Date().toISOString(),
    };
    saveUsuarios([admin]);
  }
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
