import { MESES } from '../types';
import { hasDataForMonth } from '../utils/storage';

interface Props {
  year: number;
  month: number; // 1-based
  onNavigate: (year: number, month: number) => void;
  anexo: 'anexo10' | 'anexo11';
}

export default function MonthNavigation({ year, month, onNavigate, anexo }: Props) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear - 2 + i);

  const prev = () => {
    if (month === 1) onNavigate(year - 1, 12);
    else onNavigate(year, month - 1);
  };
  const next = () => {
    if (month === 12) onNavigate(year + 1, 1);
    else onNavigate(year, month + 1);
  };

  const mesNombre = MESES[month - 1];

  return (
    <div className="flex items-center gap-3 mb-4 no-print flex-wrap">
      {/* Arrow buttons */}
      <button
        onClick={prev}
        title="Mes anterior"
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-blue-200 bg-white hover:bg-blue-50 text-blue-700 text-sm font-medium transition-colors shadow-sm"
      >
        ← Mes anterior
      </button>

      {/* Current month/year display */}
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold text-blue-900">
          {mesNombre} {year}
        </span>
        {hasDataForMonth(anexo, year, month) ? (
          <span title="Este mes tiene datos guardados" className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"></span>
        ) : null}
      </div>

      {/* Dropdowns for jump */}
      <div className="flex items-center gap-2 ml-auto">
        <select
          value={month}
          onChange={e => onNavigate(year, parseInt(e.target.value))}
          className="border border-blue-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          {MESES.map((m, i) => (
            <option key={i} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
        <select
          value={year}
          onChange={e => onNavigate(parseInt(e.target.value), month)}
          className="border border-blue-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <button
        onClick={next}
        title="Mes siguiente"
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-blue-200 bg-white hover:bg-blue-50 text-blue-700 text-sm font-medium transition-colors shadow-sm"
      >
        Mes siguiente →
      </button>
    </div>
  );
}
