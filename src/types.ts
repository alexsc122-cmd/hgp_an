export type AnexoType = 'anexo10' | 'anexo11';

// ─── Usuarios ─────────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'operador';

export interface Usuario {
  id: string;
  nombre: string;
  usuario: string;   // login username
  email: string;     // real email for Firebase Auth
  rol: UserRole;
  termosAsignados: string[];
  creadoEn: string;
}

export interface DailyEntry {
  dia: number;
  tempManana: string;
  tempTarde: string;
  humManana: string;
  humTarde: string;
  nombre: string;
  observaciones: string;
  tsManana?: number;  // Unix ms — hidden, only for compliance report
  tsTarde?: number;
}

export interface RefrigDailyEntry {
  dia: number;
  tempManana: string;
  tempTarde: string;
  nombre: string;
  observaciones: string;
  tsManana?: number;
  tsTarde?: number;
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

// ─── Termohigrómetro model ────────────────────────────────────────────────────

export interface Termohigrometro {
  id: string;
  nombre: string;
  numero: string;
  tipo: 'ambiental' | 'refrigeracion';
  ubicacion: string;
  creadoEn: string;
  revisadoPor?: string;
  cargo?: string;
}
