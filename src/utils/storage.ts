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

export { emptyEntries10, emptyEntries11 };
