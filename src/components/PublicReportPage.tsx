import { useState, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { Termohigrometro, Anexo10Data, Anexo11Data, MESES } from '../types';
import { fsLoadTermos, fsLoadRegistro } from '../utils/firestore';
import { calcProm } from '../utils/calculations';

// How many days are in a given month
function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

interface TermoReport {
  termo: Termohigrometro;
  data: Anexo10Data | Anexo11Data | null;
  diasConManana: number;
  diasConTarde: number;
  diasTotales: number; // workdays approximation — just calendar days for simplicity
  outOfRange: number;
}

export default function PublicReportPage() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const today = now.getDate();

  const [reports, setReports] = useState<TermoReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadedAt, setLoadedAt] = useState('');

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Reporte_Publico_${MESES[month - 1]}_${year}`,
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fsLoadTermos().then(async termos => {
      if (cancelled) return;

      const results = await Promise.all(termos.map(async termo => {
        const isAmbiental = termo.tipo === 'ambiental';
        let data: Anexo10Data | Anexo11Data | null = null;
        try {
          data = await fsLoadRegistro(termo.id, year, month) as Anexo10Data | Anexo11Data | null;
        } catch { /* leave null */ }

        const daysSoFar = today;

        let diasConManana = 0;
        let diasConTarde = 0;
        let outOfRange = 0;

        if (data) {
          const entries = isAmbiental
            ? (data as Anexo10Data).entries
            : (data as Anexo11Data).entries;

          entries.forEach(e => {
            if (e.tempManana) {
              diasConManana++;
              const v = parseFloat(e.tempManana);
              if (isAmbiental && v > 30) outOfRange++;
              if (!isAmbiental && (v > 8 || v < 2)) outOfRange++;
            }
            if (e.tempTarde) {
              diasConTarde++;
              const v = parseFloat(e.tempTarde);
              if (isAmbiental && v > 30) outOfRange++;
              if (!isAmbiental && (v > 8 || v < 2)) outOfRange++;
            }
          });
        }

        return {
          termo,
          data,
          diasConManana,
          diasConTarde,
          diasTotales: daysSoFar,
          outOfRange,
        } as TermoReport;
      }));

      if (!cancelled) {
        setReports(results);
        const now2 = new Date();
        setLoadedAt(
          `${now2.getDate().toString().padStart(2,'0')}/${(now2.getMonth()+1).toString().padStart(2,'0')}/${now2.getFullYear()} ${now2.getHours().toString().padStart(2,'0')}:${now2.getMinutes().toString().padStart(2,'0')}`
        );
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0f766e, #0d9488)' }}>
        <div className="text-center text-white">
          <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium opacity-80">Cargando reporte...</p>
        </div>
      </div>
    );
  }

  const mesLabel = `${MESES[month - 1]} ${year}`;

  // Pct helper
  const pct = (n: number, total: number) => total > 0 ? Math.round((n / total) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Top banner ── */}
      <div style={{ background: 'linear-gradient(90deg, #0f766e, #0d9488)' }} className="no-print">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-teal-100 text-xs font-semibold tracking-widest uppercase">Clínica Renal El Puyo — VIVENS</p>
            <h1 className="text-white text-xl font-bold leading-tight mt-0.5">
              Reporte Público de Registros — {mesLabel}
            </h1>
            <p className="text-teal-200 text-xs mt-1">Consultado el {loadedAt} · Solo lectura</p>
          </div>
          <button
            onClick={() => handlePrint()}
            className="hidden sm:flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            🖨️ Imprimir
          </button>
        </div>
      </div>

      <div ref={printRef} className="max-w-5xl mx-auto px-4 py-6 space-y-8">

        {/* ── Print-only header ── */}
        <div className="print-only" style={{ display: 'none' }}>
          <div style={{ background: 'linear-gradient(90deg, #0f766e, #0d9488)', padding: '18px 28px 14px' }}>
            <div style={{ color: 'white', fontSize: '10px', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', opacity: 0.85, marginBottom: '4px' }}>
              Clínica Renal El Puyo — VIVENS
            </div>
            <div style={{ color: 'white', fontSize: '20px', fontWeight: 800, lineHeight: 1.2 }}>
              Reporte de Registros de Temperatura — {mesLabel}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '10px', marginTop: '6px' }}>
              Consultado el {loadedAt} · Documento de solo lectura para uso de organismos de control
            </div>
          </div>
          <div style={{ background: '#f0fdfa', borderBottom: '1.5px solid #99f6e4', padding: '6px 28px', fontSize: '8px', color: '#134e4a', display: 'flex', gap: '24px' }}>
            <span><strong>Mes:</strong> {mesLabel}</span>
            <span><strong>Equipos:</strong> {reports.length}</span>
            <span><strong>Generado:</strong> {loadedAt}</span>
          </div>
        </div>

        {/* ── Resumen general ── */}
        <section>
          <h2 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Resumen general — {mesLabel}</h2>
          <div className="overflow-x-auto rounded-xl border border-teal-100 shadow-sm bg-white">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-teal-700 text-white">
                  <th className="px-3 py-2.5 text-left font-semibold">Equipo</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Tipo</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Ubicación</th>
                  <th className="px-3 py-2.5 text-center font-semibold">Reg. Mañana</th>
                  <th className="px-3 py-2.5 text-center font-semibold">Reg. Tarde</th>
                  <th className="px-3 py-2.5 text-center font-semibold">Días transcrurridos</th>
                  <th className="px-3 py-2.5 text-center font-semibold">Cumplimiento</th>
                  <th className="px-3 py-2.5 text-center font-semibold">Fuera de rango</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {reports.map(r => {
                  const cumpl = pct(r.diasConManana + r.diasConTarde, r.diasTotales * 2);
                  const ok = cumpl >= 80;
                  return (
                    <tr key={r.termo.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-semibold text-teal-900">
                        {r.termo.nombre}{r.termo.numero ? <span className="font-normal text-gray-400 ml-1">N° {r.termo.numero}</span> : ''}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${r.termo.tipo === 'ambiental' ? 'bg-teal-100 text-teal-800' : 'bg-orange-100 text-orange-700'}`}>
                          {r.termo.tipo === 'ambiental' ? 'Ambiental' : 'Refrigeración'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-500">{r.termo.ubicacion || '—'}</td>
                      <td className="px-3 py-2 text-center">{r.diasConManana} / {r.diasTotales}</td>
                      <td className="px-3 py-2 text-center">{r.diasConTarde} / {r.diasTotales}</td>
                      <td className="px-3 py-2 text-center text-gray-500">{r.diasTotales}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`font-bold ${ok ? 'text-emerald-600' : 'text-red-600'}`}>{cumpl}%</span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        {r.outOfRange > 0
                          ? <span className="font-bold text-red-600">{r.outOfRange}</span>
                          : <span className="text-emerald-600 font-semibold">✓</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Detalle por equipo ── */}
        {reports.map(r => {
          const isAmbiental = r.termo.tipo === 'ambiental';
          const data10 = isAmbiental ? r.data as Anexo10Data | null : null;
          const data11 = !isAmbiental ? r.data as Anexo11Data | null : null;
          const entries = isAmbiental ? data10?.entries ?? [] : data11?.entries ?? [];

          const tempChartData = entries
            .filter(e => e.tempManana !== '' || e.tempTarde !== '')
            .map(e => ({
              dia: e.dia,
              'Mañana': e.tempManana !== '' ? parseFloat(e.tempManana) : undefined,
              'Tarde': e.tempTarde !== '' ? parseFloat(e.tempTarde) : undefined,
              'Promedio': e.tempManana !== '' && e.tempTarde !== ''
                ? parseFloat(calcProm(e.tempManana, e.tempTarde)) : undefined,
            }));

          const humChartData = isAmbiental
            ? (data10?.entries ?? [])
                .filter(e => e.humManana !== '' || e.humTarde !== '')
                .map(e => ({
                  dia: e.dia,
                  'Mañana': e.humManana !== '' ? parseFloat(e.humManana) : undefined,
                  'Tarde': e.humTarde !== '' ? parseFloat(e.humTarde) : undefined,
                  'Promedio': e.humManana !== '' && e.humTarde !== ''
                    ? parseFloat(calcProm(e.humManana, e.humTarde)) : undefined,
                }))
            : [];

          return (
            <section key={r.termo.id} className="space-y-4" style={{ pageBreakBefore: 'always' }}>
              {/* Equipo header */}
              <div className="flex items-center gap-3">
                <div className={`w-1.5 h-8 rounded-full ${isAmbiental ? 'bg-teal-500' : 'bg-orange-400'}`} />
                <div>
                  <h2 className="text-base font-bold text-gray-800">
                    {r.termo.nombre}{r.termo.numero ? ` — N° ${r.termo.numero}` : ''}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {isAmbiental ? '🌡️ Temperatura y Humedad Ambiental' : '❄️ Refrigeración'}
                    {r.termo.ubicacion ? ` · ${r.termo.ubicacion}` : ''}
                  </p>
                </div>
              </div>

              {!r.data ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm text-amber-800 font-semibold">
                  ⚠️ Sin registros para {mesLabel}
                </div>
              ) : (
                <>
                  {/* Temperatura chart */}
                  {tempChartData.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                      <h3 className="text-sm font-bold text-gray-700 mb-3">Curva de Temperatura — {mesLabel}</h3>
                      <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={tempChartData} margin={{ top: 6, right: 20, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="dia" tick={{ fontSize: 10 }} label={{ value: 'Día', position: 'insideBottomRight', offset: -4, fontSize: 10 }} />
                          <YAxis unit="°C" tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                          <Tooltip formatter={(v: unknown) => `${v}°C`} labelFormatter={(d: unknown) => `Día ${d}`} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          {isAmbiental
                            ? <ReferenceLine y={30} stroke="#ef4444" strokeDasharray="5 3" label={{ value: 'Límite 30°C', fill: '#ef4444', fontSize: 9 }} />
                            : <>
                                <ReferenceLine y={8} stroke="#ef4444" strokeDasharray="5 3" label={{ value: 'Máx 8°C', fill: '#ef4444', fontSize: 9 }} />
                                <ReferenceLine y={2} stroke="#f97316" strokeDasharray="5 3" label={{ value: 'Mín 2°C', fill: '#f97316', fontSize: 9 }} />
                              </>
                          }
                          <Line type="monotone" dataKey="Mañana" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2.5 }} connectNulls={false} />
                          <Line type="monotone" dataKey="Tarde" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2.5 }} connectNulls={false} />
                          <Line type="monotone" dataKey="Promedio" stroke="#10b981" strokeWidth={2} strokeDasharray="4 2" dot={{ r: 2.5 }} connectNulls={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Humedad chart */}
                  {isAmbiental && humChartData.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                      <h3 className="text-sm font-bold text-gray-700 mb-3">Curva de Humedad Relativa — {mesLabel}</h3>
                      <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={humChartData} margin={{ top: 6, right: 20, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="dia" tick={{ fontSize: 10 }} label={{ value: 'Día', position: 'insideBottomRight', offset: -4, fontSize: 10 }} />
                          <YAxis unit="%" tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                          <Tooltip formatter={(v: unknown) => `${v}%`} labelFormatter={(d: unknown) => `Día ${d}`} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="5 3" label={{ value: 'Límite 70%', fill: '#ef4444', fontSize: 9 }} />
                          <Line type="monotone" dataKey="Mañana" stroke="#6366f1" strokeWidth={2} dot={{ r: 2.5 }} connectNulls={false} />
                          <Line type="monotone" dataKey="Tarde" stroke="#ec4899" strokeWidth={2} dot={{ r: 2.5 }} connectNulls={false} />
                          <Line type="monotone" dataKey="Promedio" stroke="#14b8a6" strokeWidth={2} strokeDasharray="4 2" dot={{ r: 2.5 }} connectNulls={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Tabla diaria */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-gray-100">
                      <h3 className="text-sm font-bold text-gray-700">Registros diarios — {mesLabel}</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 text-gray-600 font-semibold">
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
                            <th className="px-3 py-2 text-center">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {Array.from({ length: daysInMonth(year, month) }, (_, i) => i + 1).map(dia => {
                            const entry = entries.find(e => e.dia === dia);
                            const isFuture = dia > today;
                            const isEmpty = !entry?.tempManana && !entry?.tempTarde;

                            const tOut = entry?.tempManana || entry?.tempTarde
                              ? isAmbiental
                                ? (entry?.tempManana && parseFloat(entry.tempManana) > 30) || (entry?.tempTarde && parseFloat(entry.tempTarde) > 30)
                                : (entry?.tempManana && (parseFloat(entry.tempManana) > 8 || parseFloat(entry.tempManana) < 2)) ||
                                  (entry?.tempTarde && (parseFloat(entry.tempTarde) > 8 || parseFloat(entry.tempTarde) < 2))
                              : false;

                            const hOut = isAmbiental && entry
                              ? ((entry as DailyEntry).humManana && parseFloat((entry as DailyEntry).humManana) > 70) ||
                                ((entry as DailyEntry).humTarde && parseFloat((entry as DailyEntry).humTarde) > 70)
                              : false;

                            const tProm = entry?.tempManana && entry?.tempTarde
                              ? calcProm(entry.tempManana, entry.tempTarde) : '';
                            const hProm = isAmbiental && (entry as DailyEntry | undefined)?.humManana && (entry as DailyEntry | undefined)?.humTarde
                              ? calcProm((entry as DailyEntry).humManana, (entry as DailyEntry).humTarde) : '';

                            let rowClass = 'hover:bg-gray-50';
                            if (tOut || hOut) rowClass = 'bg-red-50';
                            else if (isFuture) rowClass = 'bg-gray-50 opacity-50';
                            else if (isEmpty) rowClass = 'bg-amber-50';

                            let estadoBadge: JSX.Element;
                            if (isFuture) {
                              estadoBadge = <span className="text-gray-300 text-xs">—</span>;
                            } else if (isEmpty) {
                              estadoBadge = <span className="inline-flex items-center gap-0.5 bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full text-xs font-semibold">⚠ Pendiente</span>;
                            } else if (!entry?.tempManana || !entry?.tempTarde) {
                              estadoBadge = <span className="inline-flex items-center gap-0.5 bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full text-xs font-semibold">⚠ Incompleto</span>;
                            } else if (tOut || hOut) {
                              estadoBadge = <span className="inline-flex items-center gap-0.5 bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full text-xs font-semibold">⚠ Fuera rango</span>;
                            } else {
                              estadoBadge = <span className="inline-flex items-center gap-0.5 bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full text-xs font-semibold">✓ OK</span>;
                            }

                            return (
                              <tr key={dia} className={rowClass}>
                                <td className="px-3 py-1.5 font-semibold text-gray-700">{dia}</td>
                                <td className={`px-3 py-1.5 text-center ${tOut && entry?.tempManana ? 'text-red-600 font-bold' : ''}`}>
                                  {entry?.tempManana ? `${entry.tempManana}°C` : isFuture ? '' : '—'}
                                </td>
                                <td className={`px-3 py-1.5 text-center ${tOut && entry?.tempTarde ? 'text-red-600 font-bold' : ''}`}>
                                  {entry?.tempTarde ? `${entry.tempTarde}°C` : isFuture ? '' : '—'}
                                </td>
                                <td className="px-3 py-1.5 text-center text-gray-500">{tProm ? `${tProm}°C` : ''}</td>
                                {isAmbiental && <>
                                  <td className={`px-3 py-1.5 text-center ${hOut && (entry as DailyEntry | undefined)?.humManana ? 'text-red-600 font-bold' : ''}`}>
                                    {(entry as DailyEntry | undefined)?.humManana ? `${(entry as DailyEntry).humManana}%` : isFuture ? '' : '—'}
                                  </td>
                                  <td className={`px-3 py-1.5 text-center ${hOut && (entry as DailyEntry | undefined)?.humTarde ? 'text-red-600 font-bold' : ''}`}>
                                    {(entry as DailyEntry | undefined)?.humTarde ? `${(entry as DailyEntry).humTarde}%` : isFuture ? '' : '—'}
                                  </td>
                                  <td className="px-3 py-1.5 text-center text-gray-500">{hProm ? `${hProm}%` : ''}</td>
                                </>}
                                <td className="px-3 py-1.5 text-gray-500">{entry?.nombre || ''}</td>
                                <td className="px-3 py-1.5 text-center">{estadoBadge}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </section>
          );
        })}

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 py-4 border-t border-gray-100">
          Documento generado automáticamente el {loadedAt} · Solo para uso de organismos de control
        </div>
      </div>
    </div>
  );
}

// Type import needed in this file
import type { DailyEntry } from '../types';
