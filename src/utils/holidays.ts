// Feriados nacionales fijos del Ecuador (MM-DD)
const FERIADOS_FIJOS: string[] = [
  '01-01', // Año Nuevo
  '02-28', // Carnaval (lunes) — aprox, varía
  '03-01', // Carnaval (martes) — aprox, varía
  '04-14', // Viernes Santo — aprox, varía
  '05-01', // Día del Trabajo
  '05-24', // Batalla de Pichincha
  '08-10', // Primer Grito de Independencia
  '10-09', // Independencia de Guayaquil
  '11-02', // Día de los Difuntos
  '11-03', // Independencia de Cuenca
  '12-25', // Navidad
];

// Los feriados móviles (Carnaval, Semana Santa) varían cada año.
// Se pueden agregar como días excepcionales en Configuración.

export function isNationalHoliday(date: Date): boolean {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return FERIADOS_FIJOS.includes(`${mm}-${dd}`);
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay(); // 0=domingo, 6=sábado
  return day === 0 || day === 6;
}

export function isWorkday(date: Date, exceptionalDays: string[]): boolean {
  if (isWeekend(date)) return false;
  if (isNationalHoliday(date)) return false;
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  if (exceptionalDays.includes(`${yyyy}-${mm}-${dd}`)) return false;
  return true;
}
