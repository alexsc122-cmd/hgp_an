import { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { Termohigrometro, MESES } from '../types';
import { loadAnexo10, loadAnexo11, getMonthsWithData } from '../utils/storage';
import { calcProm } from '../utils/calculations';

interface Props {
  termos: Termohigrometro[];
}

interface Stat {
  label: string;
  value: string;
  sub?: string;
  color: string;
  alert?: boolean;
}

function Stats({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map(s => (
        <div key={s.label} className={`rounded-xl p-4 border ${s.alert ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-100'}`}>
          <p className="text-xs font-semibold text-gray-500 mb-1">{s.label}</p>
          <p className={`text-2xl font-bold ${s.alert ? 'text-red-600' : 'text-blue-800'}`}>{s.value}</p>
          {s.sub && <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>}
        </div>
      ))}
    </div>
  );
}

export default function ReportesTab({ termos }: Props) {
  const now = new Date();
  const [selectedTermoId, setSelectedTermoId] = useState<string>(termos[0]?.id ?? '');
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  const termo = termos.find(t => t.id === selectedTermoId);
  const isAmbiental = termo?.tipo === 'ambiental';

  // All months that have data for this termo
  const monthsWithData = useMemo(
    () => (selectedTermoId ? getMonthsWithData(selectedTermoId) : []),
    [selectedTermoId]
  );

  // Available years
  const years = useMemo(() => {
    const ys = Array.from(new Set([now.getFullYear(), ...monthsWithData.map(m => m.year)]));
    return ys.sort((a, b) => b - a);
  }, [monthsWithData]);

  // Load data for selected month
  const data10 = useMemo(() => {
    if (!selectedTermoId || !isAmbiental) return null;
    return loadAnexo10(selectedYear, selectedMonth, selectedTermoId);
  }, [selectedTermoId, selectedYear, selectedMonth, isAmbiental]);

  const data11 = useMemo(() => {
    if (!selectedTermoId || isAmbiental) return null;
    return loadAnexo11(selectedYear, selectedMonth, selectedTermoId);
  }, [selectedTermoId, selectedYear, selectedMonth, isAmbiental]);

  // ─── Build chart data & stats ─────────────────────────────────────────────

  const tempChartData = useMemo(() => {
    const entries = isAmbiental ? data10?.entries : data11?.entries;
    if (!entries) return [];
    return entries
      .filter(e => e.tempManana !== '' || e.tempTarde !== '')
      .map(e => ({
        dia: e.dia,
        'Mañana': e.tempManana !== '' ? parseFloat(e.tempManana) : undefined,
        'Tarde': e.tempTarde !== '' ? parseFloat(e.tempTarde) : undefined,
        'Promedio': e.tempManana !== '' && e.tempTarde !== ''
          ? parseFloat(calcProm(e.tempManana, e.tempTarde))
          : undefined,
      }));
  }, [data10, data11, isAmbiental]);

  const humChartData = useMemo(() => {
    if (!isAmbiental || !data10) return [];
    return data10.entries
      .filter(e => e.humManana !== '' || e.humTarde !== '')
      .map(e => ({
        dia: e.dia,
        'Mañana': e.humManana !== '' ? parseFloat(e.humManana) : undefined,
        'Tarde': e.humTarde !== '' ? parseFloat(e.humTarde) : undefined,
        'Promedio': e.humManana !== '' && e.humTarde !== ''
          ? parseFloat(calcProm(e.humManana, e.humTarde))
          : undefined,
      }));
  }, [data10, isAmbiental]);

  const tempStats: Stat[] = useMemo(() => {
    const vals = tempChartData.flatMap(d => [d['Mañana'], d['Tarde']]).filter((v): v is number => v !== undefined);
    if (vals.length === 0) return [];
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    const limit = isAmbiental ? 30 : 8;
    const limitMin = isAmbiental ? null : 2;
    const outOfRange = isAmbiental
      ? vals.filter(v => v > limit).length
      : vals.filter(v => v > limit || v < (limitMin ?? -Infinity)).length;

    return [
      { label: 'Temperatura mín.', value: `${min.toFixed(1)}°C`, color: 'blue' },
      { label: 'Temperatura máx.', value: `${max.toFixed(1)}°C`, color: 'blue', alert: max > limit },
      { label: 'Promedio del mes', value: `${avg.toFixed(1)}°C`, color: 'blue' },
      { label: 'Lecturas fuera rango', value: `${outOfRange}`, sub: `de ${vals.length} lecturas`, color: 'blue', alert: outOfRange > 0 },
    ];
  }, [tempChartData, isAmbiental]);

  const humStats: Stat[] = useMemo(() => {
    if (!isAmbiental) return [];
    const vals = humChartData.flatMap(d => [d['Mañana'], d['Tarde']]).filter((v): v is number => v !== undefined);
    if (vals.length === 0) return [];
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    const outOfRange = vals.filter(v => v > 70).length;
    return [
      { label: 'Humedad mín.', value: `${min.toFixed(1)}%`, color: 'indigo' },
      { label: 'Humedad máx.', value: `${max.toFixed(1)}%`, color: 'indigo', alert: max > 70 },
      { label: 'Promedio del mes', value: `${avg.toFixed(1)}%`, color: 'indigo' },
      { label: 'Lecturas fuera rango', value: `${outOfRange}`, sub: `de ${vals.length} lecturas`, color: 'indigo', alert: outOfRange > 0 },
    ];
  }, [humChartData, isAmbiental]);

  const hasData = tempChartData.length > 0 || humChartData.length > 0;

  if (termos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center text-gray-400">
        <div className="text-4xl mb-3">📊</div>
        <p className="font-semibold text-gray-600">No hay equipos registrados</p>
        <p className="text-sm mt-1">Agrega equipos para ver reportes</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ─── Selectors ─── */}
      <div className="bg-white rounded-xl border border-blue-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Equipo */}
          <div className="flex-1 min-w-48">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Equipo</label>
            <select
              value={selectedTermoId}
              onChange={e => setSelectedTermoId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {termos.map(t => (
                <option key={t.id} value={t.id}>
                  {t.nombre}{t.numero ? ` — N° ${t.numero}` : ''}{t.ubicacion ? ` (${t.ubicacion})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Año */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Año</label>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(parseInt(e.target.value))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* Mes */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Mes</label>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(parseInt(e.target.value))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {MESES.map((m, i) => {
                const hasD = monthsWithData.some(d => d.year === selectedYear && d.month === i + 1);
                return (
                  <option key={i + 1} value={i + 1}>
                    {m}{hasD ? ' ●' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Info badge */}
          {termo && (
            <div className={`px-3 py-2 rounded-lg text-xs font-semibold ${isAmbiental ? 'bg-blue-100 text-blue-800' : 'bg-teal-100 text-teal-800'}`}>
              {isAmbiental ? '🌡️ Temperatura Ambiental' : '❄️ Refrigeración'}
            </div>
          )}
        </div>
      </div>

      {!hasData ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400 bg-white rounded-xl border border-blue-100">
          <div className="text-4xl mb-3">📭</div>
          <p className="font-semibold text-gray-600">Sin datos para {MESES[selectedMonth - 1]} {selectedYear}</p>
          <p className="text-sm mt-1">Ingresa registros de temperatura en la pantalla del equipo</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* ─── Temperatura stats ─── */}
          {tempStats.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-gray-700 mb-2">
                📊 Estadísticas de Temperatura — {MESES[selectedMonth - 1]} {selectedYear}
              </h3>
              <Stats stats={tempStats} />
            </div>
          )}

          {/* ─── Temperatura chart ─── */}
          {tempChartData.length > 0 && (
            <div className="bg-white rounded-xl border border-blue-100 shadow-sm p-4">
              <h3 className="text-sm font-bold text-blue-900 mb-4">
                Curva de Temperatura — {MESES[selectedMonth - 1]} {selectedYear}
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={tempChartData} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                  <XAxis dataKey="dia" tick={{ fontSize: 11 }} label={{ value: 'Día', position: 'insideBottomRight', offset: -4, fontSize: 11 }} />
                  <YAxis unit="°C" tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                  <Tooltip formatter={(v: unknown) => `${v}°C`} labelFormatter={(d: unknown) => `Día ${d}`} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {isAmbiental
                    ? <ReferenceLine y={30} stroke="#ef4444" strokeDasharray="5 3" label={{ value: 'Límite 30°C', fill: '#ef4444', fontSize: 10 }} />
                    : <>
                        <ReferenceLine y={8} stroke="#ef4444" strokeDasharray="5 3" label={{ value: 'Máx 8°C', fill: '#ef4444', fontSize: 10 }} />
                        <ReferenceLine y={2} stroke="#f97316" strokeDasharray="5 3" label={{ value: 'Mín 2°C', fill: '#f97316', fontSize: 10 }} />
                      </>
                  }
                  <Line type="monotone" dataKey="Mañana" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
                  <Line type="monotone" dataKey="Tarde" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
                  <Line type="monotone" dataKey="Promedio" stroke="#10b981" strokeWidth={2} strokeDasharray="4 2" dot={{ r: 3 }} connectNulls={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ─── Humedad stats ─── */}
          {humStats.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-gray-700 mb-2">
                💧 Estadísticas de Humedad Relativa — {MESES[selectedMonth - 1]} {selectedYear}
              </h3>
              <Stats stats={humStats} />
            </div>
          )}

          {/* ─── Humedad chart ─── */}
          {humChartData.length > 0 && (
            <div className="bg-white rounded-xl border border-blue-100 shadow-sm p-4">
              <h3 className="text-sm font-bold text-blue-900 mb-4">
                Curva de Humedad Relativa — {MESES[selectedMonth - 1]} {selectedYear}
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={humChartData} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                  <XAxis dataKey="dia" tick={{ fontSize: 11 }} label={{ value: 'Día', position: 'insideBottomRight', offset: -4, fontSize: 11 }} />
                  <YAxis unit="%" tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                  <Tooltip formatter={(v: unknown) => `${v}%`} labelFormatter={(d: unknown) => `Día ${d}`} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="5 3" label={{ value: 'Límite 70%', fill: '#ef4444', fontSize: 10 }} />
                  <Line type="monotone" dataKey="Mañana" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
                  <Line type="monotone" dataKey="Tarde" stroke="#ec4899" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
                  <Line type="monotone" dataKey="Promedio" stroke="#14b8a6" strokeWidth={2} strokeDasharray="4 2" dot={{ r: 3 }} connectNulls={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ─── Resumen tabla ─── */}
          <div className="bg-white rounded-xl border border-blue-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-blue-50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-blue-900">Resumen diario — {MESES[selectedMonth - 1]} {selectedYear}</h3>
              <button
                onClick={() => window.print()}
                className="text-xs bg-blue-700 hover:bg-blue-800 text-white px-3 py-1.5 rounded-lg font-semibold transition-colors"
              >
                🖨️ Imprimir reporte
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-blue-50 text-blue-900 font-semibold">
                  <tr>
                    <th className="px-3 py-2 text-left">Día</th>
                    <th className="px-3 py-2 text-center">T° Mañana</th>
                    <th className="px-3 py-2 text-center">T° Tarde</th>
                    <th className="px-3 py-2 text-center">T° Prom</th>
                    {isAmbiental && <>
                      <th className="px-3 py-2 text-center">HR Mañana</th>
                      <th className="px-3 py-2 text-center">HR Tarde</th>
                      <th className="px-3 py-2 text-center">HR Prom</th>
                    </>}
                    <th className="px-3 py-2 text-left">Responsable</th>
                    <th className="px-3 py-2 text-left">Observaciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {isAmbiental
                    ? (data10?.entries ?? []).map(e => {
                        const tProm = e.tempManana && e.tempTarde ? calcProm(e.tempManana, e.tempTarde) : '';
                        const hProm = e.humManana && e.humTarde ? calcProm(e.humManana, e.humTarde) : '';
                        const tOut = (e.tempManana && parseFloat(e.tempManana) > 30) || (e.tempTarde && parseFloat(e.tempTarde) > 30);
                        const hOut = (e.humManana && parseFloat(e.humManana) > 70) || (e.humTarde && parseFloat(e.humTarde) > 70);
                        const empty = !e.tempManana && !e.tempTarde;
                        if (empty) return null;
                        return (
                          <tr key={e.dia} className={tOut || hOut ? 'bg-red-50' : 'hover:bg-gray-50'}>
                            <td className="px-3 py-1.5 font-semibold text-gray-700">{e.dia}</td>
                            <td className={`px-3 py-1.5 text-center ${e.tempManana && parseFloat(e.tempManana) > 30 ? 'text-red-600 font-bold' : ''}`}>{e.tempManana ? `${e.tempManana}°C` : '—'}</td>
                            <td className={`px-3 py-1.5 text-center ${e.tempTarde && parseFloat(e.tempTarde) > 30 ? 'text-red-600 font-bold' : ''}`}>{e.tempTarde ? `${e.tempTarde}°C` : '—'}</td>
                            <td className="px-3 py-1.5 text-center text-gray-500">{tProm ? `${tProm}°C` : '—'}</td>
                            <td className={`px-3 py-1.5 text-center ${e.humManana && parseFloat(e.humManana) > 70 ? 'text-red-600 font-bold' : ''}`}>{e.humManana ? `${e.humManana}%` : '—'}</td>
                            <td className={`px-3 py-1.5 text-center ${e.humTarde && parseFloat(e.humTarde) > 70 ? 'text-red-600 font-bold' : ''}`}>{e.humTarde ? `${e.humTarde}%` : '—'}</td>
                            <td className="px-3 py-1.5 text-center text-gray-500">{hProm ? `${hProm}%` : '—'}</td>
                            <td className="px-3 py-1.5 text-gray-600">{e.nombre || '—'}</td>
                            <td className="px-3 py-1.5 text-gray-400">{e.observaciones || ''}</td>
                          </tr>
                        );
                      })
                    : (data11?.entries ?? []).map(e => {
                        const tProm = e.tempManana && e.tempTarde ? calcProm(e.tempManana, e.tempTarde) : '';
                        const tOut = (e.tempManana && (parseFloat(e.tempManana) > 8 || parseFloat(e.tempManana) < 2)) ||
                                     (e.tempTarde && (parseFloat(e.tempTarde) > 8 || parseFloat(e.tempTarde) < 2));
                        const empty = !e.tempManana && !e.tempTarde;
                        if (empty) return null;
                        return (
                          <tr key={e.dia} className={tOut ? 'bg-red-50' : 'hover:bg-gray-50'}>
                            <td className="px-3 py-1.5 font-semibold text-gray-700">{e.dia}</td>
                            <td className={`px-3 py-1.5 text-center ${e.tempManana && (parseFloat(e.tempManana) > 8 || parseFloat(e.tempManana) < 2) ? 'text-red-600 font-bold' : ''}`}>{e.tempManana ? `${e.tempManana}°C` : '—'}</td>
                            <td className={`px-3 py-1.5 text-center ${e.tempTarde && (parseFloat(e.tempTarde) > 8 || parseFloat(e.tempTarde) < 2) ? 'text-red-600 font-bold' : ''}`}>{e.tempTarde ? `${e.tempTarde}°C` : '—'}</td>
                            <td className="px-3 py-1.5 text-center text-gray-500">{tProm ? `${tProm}°C` : '—'}</td>
                            <td className="px-3 py-1.5 text-gray-600">{e.nombre || '—'}</td>
                            <td className="px-3 py-1.5 text-gray-400">{e.observaciones || ''}</td>
                          </tr>
                        );
                      })
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
