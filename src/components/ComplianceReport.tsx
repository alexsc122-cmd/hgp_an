import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Termohigrometro, MESES, DailyEntry, RefrigDailyEntry } from '../types';
import { fsLoadAllRegistros, fsLoadAllLockedDays, LockedDaysData } from '../utils/firestore';
import { Anexo10Data, Anexo11Data } from '../types';

interface Props {
  termos: Termohigrometro[];
  onBack: () => void;
}

type TurnoStatus = 'ontime' | 'late' | 'missing';

interface DayCompliance {
  dia: number;
  manana: TurnoStatus;
  tarde: TurnoStatus;
  lockedAt?: number;
  tsManana?: number;
  tsTarde?: number;
}

interface TermoReport {
  termo: Termohigrometro;
  days: DayCompliance[];
}

function getStatus(ts: number | undefined, turno: 'manana' | 'tarde'): TurnoStatus {
  if (!ts) return 'missing';
  const d = new Date(ts);
  const h = d.getHours() + d.getMinutes() / 60;
  if (turno === 'manana') return h >= 7 && h <= 10 ? 'ontime' : 'late';
  return h >= 13 && h <= 16 ? 'ontime' : 'late';
}

function fmtTime(ts: number | undefined): string {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
}

function statusIcon(s: TurnoStatus) {
  if (s === 'ontime') return { icon: '✅', label: 'A tiempo', cls: 'text-green-700 bg-green-50' };
  if (s === 'late') return { icon: '⚠️', label: 'Fuera de horario', cls: 'text-yellow-700 bg-yellow-50' };
  return { icon: '❌', label: 'No registrado', cls: 'text-red-700 bg-red-50' };
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export default function ComplianceReport({ termos, onBack }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<TermoReport[]>([]);

  const currentYear = now.getFullYear();
  const years = Array.from({ length: 4 }, (_, i) => currentYear - 1 + i);
  const todayDay = now.getDate();
  const isCurrentMonth = year === now.getFullYear() && month === (now.getMonth() + 1);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [registros, lockedMap] = await Promise.all([
          fsLoadAllRegistros(termos, year, month),
          fsLoadAllLockedDays(termos, year, month),
        ]);
        if (cancelled) return;

        const totalDays = daysInMonth(year, month);
        const result: TermoReport[] = termos.map(t => {
          const reg = registros.get(t.id);
          const locked: LockedDaysData = lockedMap.get(t.id) ?? { days: new Set(), lockedAt: {} };

          const days: DayCompliance[] = Array.from({ length: totalDays }, (_, i) => {
            const dia = i + 1;
            let tsManana: number | undefined;
            let tsTarde: number | undefined;

            if (reg) {
              if (t.tipo === 'ambiental') {
                const entry = (reg as Anexo10Data).entries?.find(e => e.dia === dia) as DailyEntry | undefined;
                tsManana = entry?.tsManana;
                tsTarde = entry?.tsTarde;
              } else {
                const entry = (reg as Anexo11Data).entries?.find(e => e.dia === dia) as RefrigDailyEntry | undefined;
                tsManana = entry?.tsManana;
                tsTarde = entry?.tsTarde;
              }
            }

            return {
              dia,
              manana: getStatus(tsManana, 'manana'),
              tarde: getStatus(tsTarde, 'tarde'),
              lockedAt: locked.lockedAt[dia],
              tsManana,
              tsTarde,
            };
          });

          return { termo: t, days };
        });

        setReport(result);
      } catch {
        alert('Error al cargar datos del reporte.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [year, month, termos]);

  function exportExcel() {
    const wb = XLSX.utils.book_new();
    const mesNombre = MESES[month - 1];

    report.forEach(({ termo, days }) => {
      const rows: (string | number)[][] = [
        [`Reporte de Cumplimiento — ${termo.nombre} (${termo.tipo === 'ambiental' ? 'Ambiente' : 'Refrigeración'})`],
        [`Período: ${mesNombre} ${year}`],
        ['Horario aceptable: Mañana 07:00–10:00 | Tarde 13:00–16:00'],
        [],
        ['DÍA', 'MAÑANA HORA', 'MAÑANA ESTADO', 'TARDE HORA', 'TARDE ESTADO', 'CONFIRMADO'],
        ...days.map(d => [
          d.dia,
          fmtTime(d.tsManana),
          d.manana === 'ontime' ? 'A tiempo' : d.manana === 'late' ? 'Fuera de horario' : 'No registrado',
          fmtTime(d.tsTarde),
          d.tarde === 'ontime' ? 'A tiempo' : d.tarde === 'late' ? 'Fuera de horario' : 'No registrado',
          d.lockedAt ? fmtTime(d.lockedAt) : 'No confirmado',
        ]),
      ];
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [{ wch: 6 }, { wch: 14 }, { wch: 18 }, { wch: 14 }, { wch: 18 }, { wch: 16 }];
      XLSX.utils.book_append_sheet(wb, ws, termo.nombre.substring(0, 31));
    });

    XLSX.writeFile(wb, `Cumplimiento_${MESES[month - 1]}_${year}.xlsx`);
  }

  const totalDays = daysInMonth(year, month);
  const daysToShow = isCurrentMonth ? todayDay : totalDays;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100">
      {/* Nav */}
      <nav className="bg-blue-900 text-white px-6 py-3 flex items-center gap-3 shadow-lg">
        <button onClick={onBack} className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
          ← Volver
        </button>
        <div className="flex-1">
          <div className="font-bold text-sm">📊 Reporte de Cumplimiento</div>
          <div className="text-xs text-blue-200">Control de horarios de registro — Norma farmacéutica</div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportExcel}
            className="bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
          >
            📥 Excel
          </button>
          <button
            onClick={() => window.print()}
            className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          >
            🖨️ PDF
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Period selector */}
        <div className="flex items-center gap-4 mb-6 bg-white rounded-xl p-4 shadow-sm border border-blue-100">
          <span className="text-sm font-semibold text-blue-900">Período:</span>
          <select
            className="border border-blue-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={month}
            onChange={e => setMonth(parseInt(e.target.value))}
          >
            {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select
            className="border border-blue-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={year}
            onChange={e => setYear(parseInt(e.target.value))}
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <div className="text-xs text-gray-500 ml-2">
            Mañana: 07:00–10:00 · Tarde: 13:00–16:00 (±1h norma)
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-4 mb-4 text-xs">
          {[
            { icon: '✅', label: 'A tiempo', cls: 'text-green-700' },
            { icon: '⚠️', label: 'Fuera de horario', cls: 'text-yellow-700' },
            { icon: '❌', label: 'No registrado', cls: 'text-red-700' },
            { icon: '🔒', label: 'Día confirmado', cls: 'text-gray-600' },
          ].map(l => (
            <span key={l.label} className={`flex items-center gap-1 font-semibold ${l.cls}`}>
              {l.icon} {l.label}
            </span>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-20 text-blue-500">Cargando datos...</div>
        ) : (
          <div className="space-y-6">
            {report.map(({ termo, days }) => {
              const shown = days.slice(0, daysToShow);
              const ontime = shown.filter(d => d.manana === 'ontime' && d.tarde === 'ontime').length;
              const partial = shown.filter(d => (d.manana !== 'missing' || d.tarde !== 'missing') && !(d.manana === 'ontime' && d.tarde === 'ontime')).length;
              const missing = shown.filter(d => d.manana === 'missing' && d.tarde === 'missing').length;
              const pct = shown.length > 0 ? Math.round((ontime / shown.length) * 100) : 0;

              return (
                <div key={termo.id} className="bg-white rounded-xl shadow-sm border border-blue-100 overflow-hidden">
                  {/* Termo header */}
                  <div className="bg-blue-900 text-white px-4 py-3 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-sm">{termo.nombre}</span>
                      <span className="text-xs text-blue-200 ml-2">
                        {termo.tipo === 'ambiental' ? 'Temp/Humedad Ambiental' : 'Refrigeración'}
                        {termo.numero ? ` · N° ${termo.numero}` : ''}
                      </span>
                    </div>
                    <div className="flex gap-4 text-xs">
                      <span className="text-green-300 font-bold">✅ {ontime}</span>
                      <span className="text-yellow-300 font-bold">⚠️ {partial}</span>
                      <span className="text-red-300 font-bold">❌ {missing}</span>
                      <span className={`font-bold px-2 py-0.5 rounded ${pct >= 90 ? 'bg-green-700' : pct >= 70 ? 'bg-yellow-600' : 'bg-red-700'}`}>
                        {pct}% cumplimiento
                      </span>
                    </div>
                  </div>

                  {/* Days grid */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-blue-50 border-b border-blue-100">
                          <th className="px-3 py-2 text-left text-blue-800 font-bold w-12">DÍA</th>
                          <th className="px-3 py-2 text-center text-blue-800 font-bold">MAÑANA</th>
                          <th className="px-3 py-2 text-center text-blue-800 font-bold">HORA M.</th>
                          <th className="px-3 py-2 text-center text-blue-800 font-bold">TARDE</th>
                          <th className="px-3 py-2 text-center text-blue-800 font-bold">HORA T.</th>
                          <th className="px-3 py-2 text-center text-blue-800 font-bold">CONFIRMADO</th>
                        </tr>
                      </thead>
                      <tbody>
                        {shown.map(d => {
                          const m = statusIcon(d.manana);
                          const t = statusIcon(d.tarde);
                          const isToday = isCurrentMonth && d.dia === todayDay;
                          const rowCls = isToday ? 'bg-blue-50 font-semibold' : d.dia % 2 === 0 ? 'bg-gray-50/50' : 'bg-white';
                          return (
                            <tr key={d.dia} className={`border-b border-gray-100 ${rowCls}`}>
                              <td className="px-3 py-1.5 font-bold text-blue-900">
                                {d.dia}{isToday && <span className="ml-1 text-blue-500 text-xs">◀ hoy</span>}
                              </td>
                              <td className={`px-3 py-1.5 text-center rounded-sm ${m.cls}`}>
                                {m.icon} <span className="hidden sm:inline">{m.label}</span>
                              </td>
                              <td className="px-3 py-1.5 text-center text-gray-600 font-mono">
                                {fmtTime(d.tsManana)}
                              </td>
                              <td className={`px-3 py-1.5 text-center rounded-sm ${t.cls}`}>
                                {t.icon} <span className="hidden sm:inline">{t.label}</span>
                              </td>
                              <td className="px-3 py-1.5 text-center text-gray-600 font-mono">
                                {fmtTime(d.tsTarde)}
                              </td>
                              <td className="px-3 py-1.5 text-center text-gray-500">
                                {d.lockedAt ? `🔒 ${fmtTime(d.lockedAt)}` : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
