import { useState } from 'react';
import { Termohigrometro, MESES } from '../types';

interface Props {
  termo: Termohigrometro;
  selectedYear: number;
  selectedMonth: number;
  onNavigate: (year: number, month: number) => void;
  onBack: () => void;
  monthsWithData: { year: number; month: number }[];
  isOpen: boolean;
  onToggle: () => void;
}

export default function Sidebar({
  termo,
  selectedYear,
  selectedMonth,
  onNavigate,
  onBack,
  monthsWithData,
  isOpen,
  onToggle,
}: Props) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const yearsWithData = Array.from(new Set(monthsWithData.map(m => m.year)));

  // Always include current year
  if (!yearsWithData.includes(currentYear)) yearsWithData.push(currentYear);
  yearsWithData.sort((a, b) => b - a); // descending

  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set([selectedYear, currentYear]));

  const toggleYear = (y: number) => {
    const next = new Set(expandedYears);
    if (next.has(y)) next.delete(y);
    else next.add(y);
    setExpandedYears(next);
  };

  const hasData = (y: number, m: number) => monthsWithData.some(d => d.year === y && d.month === m);
  const isSelected = (y: number, m: number) => y === selectedYear && m === selectedMonth;
  const isCurrent = (y: number, m: number) => y === currentYear && m === currentMonth;

  const isAmbiental = termo.tipo === 'ambiental';

  return (
    <>
      {/* Hamburger toggle button — only visible when sidebar is CLOSED */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed top-16 left-3 z-40 p-2 rounded-lg bg-white border border-blue-200 shadow-md hover:bg-blue-50 transition-colors no-print"
          title="Mostrar panel"
        >
          <svg className="w-5 h-5 text-blue-700" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 md:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`fixed top-0 left-0 h-full z-30 flex flex-col bg-white border-r border-blue-100 shadow-lg transition-transform duration-300 no-print ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ width: 256, paddingTop: 56 }}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Back button + equipo info */}
          <div className="px-4 pt-4 pb-3 border-b border-blue-50">
            {/* Top row: back button + close sidebar button */}
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={onBack}
                className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
              >
                ← Equipos
              </button>
              <button
                onClick={onToggle}
                className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-400 hover:text-blue-700 transition-colors"
                title="Ocultar panel"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                  isAmbiental ? 'bg-blue-100 text-blue-800' : 'bg-teal-100 text-teal-800'
                }`}
              >
                {isAmbiental ? 'Ambiente' : 'Refrigeración'}
              </span>
            </div>
            <h2 className="font-bold text-blue-900 text-sm mt-1 leading-tight">{termo.nombre}</h2>
            {termo.numero && <p className="text-xs text-gray-500">N° {termo.numero}</p>}
          </div>

          {/* Year/month tree */}
          <nav className="flex-1 overflow-y-auto px-2 py-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-2 mb-2">Meses registrados</p>
            {yearsWithData.map(y => (
              <div key={y} className="mb-1">
                <button
                  onClick={() => toggleYear(y)}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-blue-50 transition-colors text-sm font-semibold text-blue-900"
                >
                  <span>{y}</span>
                  <svg
                    className={`w-3.5 h-3.5 text-blue-400 transition-transform ${expandedYears.has(y) ? 'rotate-90' : ''}`}
                    fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                {expandedYears.has(y) && (
                  <div className="ml-2 mt-0.5 space-y-0.5">
                    {MESES.map((mesNombre, idx) => {
                      const m = idx + 1;
                      const active = isSelected(y, m);
                      const current = isCurrent(y, m);
                      const hasD = hasData(y, m);
                      // Show: months with data OR current month
                      if (!hasD && !current) return null;
                      return (
                        <button
                          key={m}
                          onClick={() => onNavigate(y, m)}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors ${
                            active
                              ? isAmbiental
                                ? 'bg-blue-700 text-white font-semibold'
                                : 'bg-teal-700 text-white font-semibold'
                              : 'hover:bg-blue-50 text-gray-700'
                          }`}
                        >
                          <span className="flex-1 text-left">{mesNombre}</span>
                          {hasD && (
                            <span className={`w-2 h-2 rounded-full shrink-0 ${active ? 'bg-white/70' : 'bg-green-500'}`} title="Con datos" />
                          )}
                          {current && !active && (
                            <span className="text-xs text-blue-400 shrink-0">•</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
}
