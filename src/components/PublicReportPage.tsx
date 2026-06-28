import { useState, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { Termohigrometro, Anexo10Data, Anexo11Data, DailyEntry, RefrigDailyEntry, MESES } from '../types';
import { fsLoadTermos, fsLoadRegistro } from '../utils/firestore';
import { calcProm } from '../utils/calculations';

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

interface TermoReport {
  termo: Termohigrometro;
  data: Anexo10Data | Anexo11Data | null;
  diasConManana: number;
  diasConTarde: number;
  outOfRange: number;
}

// Collapse consecutive empty days into a single row
interface DayRow {
  type: 'data' | 'empty-single' | 'empty-range';
  day?: number;
  from?: number;
  to?: number;
  entry?: DailyEntry | RefrigDailyEntry;
}

function buildDayRows(
  entries: (DailyEntry | RefrigDailyEntry)[],
  today: number,
  totalDays: number
): DayRow[] {
  const rows: DayRow[] = [];
  let emptyStart: number | null = null;

  const flush = (upTo: number) => {
    if (emptyStart === null) return;
    const count = upTo - emptyStart;
    if (count === 1) {
      rows.push({ type: 'empty-single', day: emptyStart });
    } else if (count > 1) {
      rows.push({ type: 'empty-range', from: emptyStart, to: upTo - 1 });
    }
    emptyStart = null;
  };

  for (let d = 1; d <= Math.min(today, totalDays); d++) {
    const entry = entries.find(e => e.dia === d);
    const hasData = entry && (entry.tempManana || entry.tempTarde);
    if (hasData) {
      flush(d);
      rows.push({ type: 'data', day: d, entry });
    } else {
      if (emptyStart === null) emptyStart = d;
    }
  }
  flush(Math.min(today, totalDays) + 1);
  return rows;
}

export default function PublicReportPage() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const today = now.getDate();
  const totalDays = daysInMonth(year, month);

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
    fsLoadTermos().then(async termos => {
      if (cancelled) return;
      const results = await Promise.all(termos.map(async termo => {
        const isAmbiental = termo.tipo === 'ambiental';
        let data: Anexo10Data | Anexo11Data | null = null;
        try { data = await fsLoadRegistro(termo.id, year, month) as Anexo10Data | Anexo11Data | null; } catch { /**/ }

        const entries = isAmbiental
          ? (data as Anexo10Data | null)?.entries ?? []
          : (data as Anexo11Data | null)?.entries ?? [];

        let diasConManana = 0, diasConTarde = 0, outOfRange = 0;
        entries.forEach(e => {
          if (e.tempManana) { diasConManana++; const v = parseFloat(e.tempManana); if (isAmbiental ? v > 30 : (v > 8 || v < 2)) outOfRange++; }
          if (e.tempTarde)  { diasConTarde++;  const v = parseFloat(e.tempTarde);  if (isAmbiental ? v > 30 : (v > 8 || v < 2)) outOfRange++; }
        });
        return { termo, data, diasConManana, diasConTarde, outOfRange } as TermoReport;
      }));
      if (!cancelled) {
        setReports(results);
        const t = new Date();
        setLoadedAt(`${String(t.getDate()).padStart(2,'0')}/${String(t.getMonth()+1).padStart(2,'0')}/${t.getFullYear()} ${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}`);
        setLoading(false);
      }
    }).catch(() => { if (!cancelled) setLoading(false); });
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
  const pct = (m: number, t: number, d: number) => d > 0 ? Math.round(((m + t) / (d * 2)) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Top banner (screen only) ── */}
      <div style={{ background: 'linear-gradient(90deg, #0f766e, #0d9488)' }} className="no-print">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-teal-100 text-xs font-semibold tracking-widest uppercase">Clínica Renal El Puyo — VIVENS</p>
            <h1 className="text-white text-xl font-bold mt-0.5">Reporte Público — {mesLabel}</h1>
            <p className="text-teal-200 text-xs mt-1">Consultado el {loadedAt} · Solo lectura</p>
          </div>
          <button onClick={() => handlePrint()}
            className="hidden sm:flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            🖨️ Imprimir
          </button>
        </div>
      </div>

      <div ref={printRef} className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* ── Print header ── */}
        <div className="print-only" style={{ display: 'none' }}>
          <div style={{ background: 'linear-gradient(90deg, #0f766e, #0d9488)', padding: '16px 28px 12px' }}>
            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '9px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '4px' }}>Clínica Renal El Puyo — VIVENS</div>
            <div style={{ color: 'white', fontSize: '18px', fontWeight: 800 }}>Reporte de Registros de Temperatura — {mesLabel}</div>
            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '9px', marginTop: '4px' }}>Consultado el {loadedAt} · Solo lectura · Uso de organismos de control</div>
          </div>
          <div style={{ background: '#f0fdfa', borderBottom: '1.5px solid #99f6e4', padding: '5px 28px', display: 'flex', gap: '24px', fontSize: '9px', color: '#134e4a' }}>
            <span><strong>Mes:</strong> {mesLabel}</span>
            <span><strong>Equipos:</strong> {reports.length}</span>
            <span><strong>Días transcurridos:</strong> {today} de {totalDays}</span>
            <span><strong>Generado:</strong> {loadedAt}</span>
          </div>
        </div>

        {/* ── Resumen general ── */}
        <section>
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 pb-2 border-b border-gray-200">Resumen general</h2>
          <div className="overflow-x-auto rounded-xl border border-teal-100 shadow-sm bg-white">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: '#0f766e', color: 'white' }}>
                  <th className="px-3 py-2.5 text-left font-semibold">Equipo</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Tipo</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Ubicación</th>
                  <th className="px-3 py-2.5 text-center font-semibold">Reg. M / T</th>
                  <th className="px-3 py-2.5 text-center font-semibold">Cumplimiento</th>
                  <th className="px-3 py-2.5 text-center font-semibold">Fuera de rango</th>
                  <th className="px-3 py-2.5 text-center font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {reports.map(r => {
                  const cumpl = pct(r.diasConManana, r.diasConTarde, today);
                  const noData = !r.data || (r.diasConManana === 0 && r.diasConTarde === 0);
                  const pendingDays = today - r.diasConManana;
                  return (
                    <tr key={r.termo.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-bold text-teal-900">
                        {r.termo.nombre}{r.termo.numero ? <span className="font-normal text-gray-400 ml-1.5 text-xs">N° {r.termo.numero}</span> : ''}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${r.termo.tipo === 'ambiental' ? 'bg-teal-100 text-teal-800' : 'bg-orange-100 text-orange-700'}`}>
                          {r.termo.tipo === 'ambiental' ? 'Ambiental' : 'Refrigeración'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-500">{r.termo.ubicacion || '—'}</td>
                      <td className="px-3 py-2 text-center">{r.diasConManana} / {r.diasConTarde}</td>
                      <td className="px-3 py-2 text-center font-bold">
                        <span className={cumpl >= 80 ? 'text-emerald-600' : cumpl >= 50 ? 'text-amber-500' : 'text-red-600'}>{cumpl}%</span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        {r.outOfRange > 0 ? <span className="font-bold text-red-600">{r.outOfRange}</span> : <span className="text-emerald-500 font-semibold">✓</span>}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {noData
                          ? <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-semibold">Sin registros</span>
                          : pendingDays > 3
                            ? <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs font-semibold">⚠ {pendingDays} pendientes</span>
                            : <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-xs font-semibold">✓ Al día</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Detalle por equipo ── */}
        <section className="space-y-5">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest pb-2 border-b border-gray-200">Detalle por equipo</h2>

          {reports.map(r => {
            const isAmbiental = r.termo.tipo === 'ambiental';
            const data10 = isAmbiental ? r.data as Anexo10Data | null : null;
            const data11 = !isAmbiental ? r.data as Anexo11Data | null : null;
            const entries: (DailyEntry | RefrigDailyEntry)[] = isAmbiental
              ? data10?.entries ?? []
              : data11?.entries ?? [];

            const noData = entries.every(e => !e.tempManana && !e.tempTarde);

            const tempChartData = entries
              .filter(e => e.tempManana || e.tempTarde)
              .map(e => ({
                dia: e.dia,
                'M': e.tempManana ? parseFloat(e.tempManana) : undefined,
                'T': e.tempTarde ? parseFloat(e.tempTarde) : undefined,
                'P': e.tempManana && e.tempTarde ? parseFloat(calcProm(e.tempManana, e.tempTarde)) : undefined,
              }));

            const humChartData = isAmbiental
              ? (data10?.entries ?? []).filter(e => (e as DailyEntry).humManana || (e as DailyEntry).humTarde).map(e => ({
                  dia: e.dia,
                  'M': (e as DailyEntry).humManana ? parseFloat((e as DailyEntry).humManana) : undefined,
                  'T': (e as DailyEntry).humTarde  ? parseFloat((e as DailyEntry).humTarde)  : undefined,
                  'P': (e as DailyEntry).humManana && (e as DailyEntry).humTarde
                    ? parseFloat(calcProm((e as DailyEntry).humManana, (e as DailyEntry).humTarde)) : undefined,
                }))
              : [];

            const dayRows = buildDayRows(entries, today, totalDays);

            const StatusBadge = ({ entry, day }: { entry?: DailyEntry | RefrigDailyEntry; day: number }) => {
              if (day > today) return <span className="text-gray-300 text-xs">—</span>;
              if (!entry || (!entry.tempManana && !entry.tempTarde))
                return <span className="inline-flex items-center gap-0.5 bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full text-xs font-semibold">⚠ Pendiente</span>;
              if (!entry.tempManana || !entry.tempTarde)
                return <span className="inline-flex items-center gap-0.5 bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full text-xs font-semibold">⚠ Incompleto</span>;
              const v1 = parseFloat(entry.tempManana), v2 = parseFloat(entry.tempTarde);
              const outT = isAmbiental ? (v1 > 30 || v2 > 30) : (v1 > 8 || v1 < 2 || v2 > 8 || v2 < 2);
              const e10 = entry as DailyEntry;
              const outH = isAmbiental && e10.humManana && e10.humTarde
                ? parseFloat(e10.humManana) > 70 || parseFloat(e10.humTarde) > 70 : false;
              if (outT || outH)
                return <span className="inline-flex items-center gap-0.5 bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full text-xs font-semibold">⚠ Fuera rango</span>;
              return <span className="inline-flex items-center gap-0.5 bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full text-xs font-semibold">✓ OK</span>;
            };

            return (
              <div key={r.termo.id} className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
                {/* Equipo header */}
                <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <div className={`w-1 h-8 rounded-full shrink-0 ${isAmbiental ? 'bg-teal-500' : 'bg-orange-400'}`} />
                  <div>
                    <div className="font-bold text-sm text-gray-800">
                      {r.termo.nombre}{r.termo.numero ? ` — N° ${r.termo.numero}` : ''}
                      <span className={`ml-2 text-xs font-semibold px-2 py-0.5 rounded-full ${isAmbiental ? 'bg-teal-100 text-teal-800' : 'bg-orange-100 text-orange-700'}`}>
                        {isAmbiental ? 'Ambiental' : 'Refrigeración'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {isAmbiental ? '🌡️ Temperatura y Humedad' : '❄️ Temperatura'}{r.termo.ubicacion ? ` · ${r.termo.ubicacion}` : ''}
                    </div>
                  </div>
                </div>

                {noData ? (
                  <div className="flex items-center gap-3 px-5 py-4" style={{ background: '#fff7ed', borderTop: '3px solid #f97316' }}>
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <p className="text-sm font-bold text-orange-900">Sin registros para {mesLabel}</p>
                      <p className="text-xs text-orange-700 mt-0.5">Este equipo no tiene ningún dato ingresado en el período.</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col lg:flex-row">
                    {/* Charts column */}
                    <div className="lg:w-64 shrink-0 p-4 border-b lg:border-b-0 lg:border-r border-gray-100 space-y-4">
                      {tempChartData.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-gray-600 mb-2">Temperatura</p>
                          <ResponsiveContainer width="100%" height={140}>
                            <LineChart data={tempChartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                              <XAxis dataKey="dia" tick={{ fontSize: 8 }} />
                              <YAxis unit="°" tick={{ fontSize: 8 }} domain={['auto', 'auto']} />
                              <Tooltip formatter={(v: unknown) => `${v}°C`} labelFormatter={(d: unknown) => `Día ${d}`} />
                              <Legend wrapperStyle={{ fontSize: 9 }} />
                              {isAmbiental
                                ? <ReferenceLine y={30} stroke="#ef4444" strokeDasharray="4 2" />
                                : <>
                                    <ReferenceLine y={8} stroke="#ef4444" strokeDasharray="4 2" />
                                    <ReferenceLine y={2} stroke="#f97316" strokeDasharray="4 2" />
                                  </>}
                              <Line type="monotone" dataKey="M" name="Mañana" stroke="#3b82f6" strokeWidth={1.5} dot={false} connectNulls={false} />
                              <Line type="monotone" dataKey="T" name="Tarde" stroke="#f59e0b" strokeWidth={1.5} dot={false} connectNulls={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                      {isAmbiental && humChartData.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-gray-600 mb-2">Humedad relativa</p>
                          <ResponsiveContainer width="100%" height={120}>
                            <LineChart data={humChartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                              <XAxis dataKey="dia" tick={{ fontSize: 8 }} />
                              <YAxis unit="%" tick={{ fontSize: 8 }} domain={['auto', 'auto']} />
                              <Tooltip formatter={(v: unknown) => `${v}%`} labelFormatter={(d: unknown) => `Día ${d}`} />
                              <Legend wrapperStyle={{ fontSize: 9 }} />
                              <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="4 2" />
                              <Line type="monotone" dataKey="M" name="Mañana" stroke="#6366f1" strokeWidth={1.5} dot={false} connectNulls={false} />
                              <Line type="monotone" dataKey="T" name="Tarde" stroke="#ec4899" strokeWidth={1.5} dot={false} connectNulls={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>

                    {/* Table column */}
                    <div className="flex-1 overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                          <tr>
                            <th className="px-3 py-2 text-left">Día</th>
                            <th className="px-3 py-2 text-center">T° M / T</th>
                            {isAmbiental && <th className="px-3 py-2 text-center">HR M / T</th>}
                            <th className="px-3 py-2 text-left">Responsable</th>
                            <th className="px-3 py-2 text-center">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {dayRows.map((row, i) => {
                            if (row.type === 'empty-range') {
                              return (
                                <tr key={i} className="bg-red-50">
                                  <td className="px-3 py-1.5 font-semibold text-gray-500">{row.from} – {row.to}</td>
                                  <td colSpan={isAmbiental ? 3 : 2} className="px-3 py-1.5 text-gray-400 italic text-xs">
                                    {(row.to! - row.from! + 1)} días sin registro
                                  </td>
                                  <td className="px-3 py-1.5 text-center">
                                    <span className="inline-flex items-center gap-0.5 bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full text-xs font-semibold">⚠ Pendiente</span>
                                  </td>
                                </tr>
                              );
                            }
                            if (row.type === 'empty-single') {
                              return (
                                <tr key={i} className="bg-red-50">
                                  <td className="px-3 py-1.5 font-semibold text-gray-500">{row.day}</td>
                                  <td colSpan={isAmbiental ? 3 : 2} className="px-3 py-1.5 text-gray-400">—</td>
                                  <td className="px-3 py-1.5 text-center">
                                    <span className="inline-flex items-center gap-0.5 bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full text-xs font-semibold">⚠ Pendiente</span>
                                  </td>
                                </tr>
                              );
                            }
                            const e = row.entry!;
                            const e10 = e as DailyEntry;
                            const tProm = e.tempManana && e.tempTarde ? calcProm(e.tempManana, e.tempTarde) : '';
                            const hProm = isAmbiental && e10.humManana && e10.humTarde ? calcProm(e10.humManana, e10.humTarde) : '';
                            const v1 = e.tempManana ? parseFloat(e.tempManana) : null;
                            const v2 = e.tempTarde  ? parseFloat(e.tempTarde)  : null;
                            const tOut = v1 !== null && v2 !== null && (isAmbiental ? (v1 > 30 || v2 > 30) : (v1 > 8 || v1 < 2 || v2 > 8 || v2 < 2));
                            const hOut = isAmbiental && e10.humManana && e10.humTarde
                              ? parseFloat(e10.humManana) > 70 || parseFloat(e10.humTarde) > 70 : false;
                            return (
                              <tr key={i} className={tOut || hOut ? 'bg-red-50' : 'hover:bg-gray-50'}>
                                <td className="px-3 py-1.5 font-semibold text-gray-700">{e.dia}</td>
                                <td className={`px-3 py-1.5 text-center font-medium ${tOut ? 'text-red-600' : ''}`}>
                                  {e.tempManana || '—'} / {e.tempTarde || '—'}
                                  {tProm ? <span className="ml-1 text-gray-400 font-normal">({tProm}°)</span> : ''}
                                </td>
                                {isAmbiental && (
                                  <td className={`px-3 py-1.5 text-center font-medium ${hOut ? 'text-red-600' : ''}`}>
                                    {e10.humManana || '—'} / {e10.humTarde || '—'}
                                    {hProm ? <span className="ml-1 text-gray-400 font-normal">({hProm}%)</span> : ''}
                                  </td>
                                )}
                                <td className="px-3 py-1.5 text-gray-500 truncate max-w-[120px]">{e.nombre || '—'}</td>
                                <td className="px-3 py-1.5 text-center"><StatusBadge entry={e} day={e.dia} /></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </section>

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 py-4 border-t border-gray-100">
          Documento generado automáticamente el {loadedAt} · Solo para uso de organismos de control · Clínica Renal El Puyo — VIVENS
        </div>
      </div>
    </div>
  );
}
