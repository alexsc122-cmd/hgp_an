export type AnexoType = 'anexo10' | 'anexo11';

export interface DailyEntry {
  dia: number;
  tempManana: string;
  tempTarde: string;
  humManana: string;
  humTarde: string;
  nombre: string;
  observaciones: string;
}

export interface RefrigDailyEntry {
  dia: number;
  tempManana: string;
  tempTarde: string;
  nombre: string;
  observaciones: string;
}

export interface HeaderInfo {
  institucion: string;
  estrategia: string;
  establecimiento: string;
  direccion: string;
  noEquipo: string;
  anio: string;
  mes: string;
}

export interface FooterInfo {
  revisadoPor: string;
  cargo: string;
  fecha: string;
}

export interface Anexo10Data {
  header: HeaderInfo;
  footer: FooterInfo;
  entries: DailyEntry[];
}

export interface Anexo11Data {
  header: HeaderInfo;
  footer: FooterInfo;
  entries: RefrigDailyEntry[];
}

export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];
