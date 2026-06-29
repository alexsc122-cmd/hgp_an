export type AnexoType = 'anexo10' | 'anexo11';

// ─── Usuarios ─────────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'validador' | 'operador';

export interface Usuario {
  id: string;
  nombre: string;
  usuario: string;   // login username
  email: string;     // real email for Firebase Auth
  rol: UserRole;
  cargo: string;
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

export interface MesValidacion {
  validadoPor: string;      // nombre del usuario que validó
  validadoCargo: string;    // cargo
  validadoFecha: string;    // fecha del footer
  validadoEn: number;       // timestamp ms
  validadoUsuario: string;  // login
}

export interface Anexo10Data {
  header: HeaderInfo;
  footer: FooterInfo;
  entries: DailyEntry[];
  validacion?: MesValidacion;
}

export interface Anexo11Data {
  header: HeaderInfo;
  footer: FooterInfo;
  entries: RefrigDailyEntry[];
  validacion?: MesValidacion;
}

export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

// ─── Calibración ─────────────────────────────────────────────────────────────

export interface Calibracion {
  id: string;
  termoId: string;
  fecha: string;          // ISO date YYYY-MM-DD
  numeroCertificado: string;
  laboratorio: string;
  resultado: string;      // 'aprobado' | 'con observaciones' | libre
  observaciones: string;
  creadoEn: string;
}

// ─── Limpieza ─────────────────────────────────────────────────────────────────

export interface Limpieza {
  id: string;
  termoId: string;
  fecha: string;           // ISO date YYYY-MM-DD
  tipo: 'mensual' | 'descongelacion' | 'otro';
  responsable: string;
  observaciones: string;
  creadoEn: string;
}

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
