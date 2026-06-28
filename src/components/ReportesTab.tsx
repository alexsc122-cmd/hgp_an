import { useState, useMemo, useRef, useEffect } from 'react';
import { useReactToPrint } from 'react-to-print';
import { QRCodeSVG } from 'qrcode.react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { Termohigrometro, Anexo10Data, Anexo11Data, MESES } from '../types';
import { fsLoadRegistro, fsGetMonthsWithData } from '../utils/firestore';
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

interface RangePoint {
  label: string;
  promManana: number | undefined;
  promTarde: number | undefined;
  promHumManana?: number | undefined;
  promHumTarde?: number | undefined;
}

export default function ReportesTab({ termos }: Props) {
  const now = new Date();
  const [mode, setMode] = useState<'mes' | 'rango'>('mes');
  const [selectedTermoId, setSelectedTermoId] = useState<string>(termos[0]?.id ?? '');
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [monthsWithData, setMonthsWithData] = useState<{ year: number; month: number }[]>([]);
  const [data10, setData10] = useState<Anexo10Data | null>(null);
  const [data11, setData11] = useState<Anexo11Data | null>(null);
  const [loading, setLoading] = useState(false);

  // Rango state
  const [rangeFromYear, setRangeFromYear] = useState(now.getFullYear());
  const [rangeFromMonth, setRangeFromMonth] = useState(1);
  const [rangeToYear, setRangeToYear] = useState(now.getFullYear());
  const [rangeToMonth, setRangeToMonth] = useState(now.getMonth() + 1);
  const [rangeData, setRangeData] = useState<RangePoint[]>([]);
  const [rangeLoading, setRangeLoading] = useState(false);

  const termo = termos.find(t => t.id === selectedTermoId);
  const isAmbiental = termo?.tipo === 'ambiental';

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: mode === 'mes'
      ? `Reporte_${termo?.nombre ?? ''}_${MESES[selectedMonth - 1]}_${selectedYear}`
      : `Reporte_${termo?.nombre ?? ''}_${MESES[rangeFromMonth - 1]}${rangeFromYear}_${MESES[rangeToMonth - 1]}${rangeToYear}`,
  });

  // Load months with data when termo changes
  useEffect(() => {
    if (!selectedTermoId) return;
    fsGetMonthsWithData(selectedTermoId)
      .then(setMonthsWithData)
      .catch(() => alert('Error al cargar meses con datos.'));
  }, [selectedTermoId]);

  // Load registro data when termo, year, or month changes (mes mode)
  useEffect(() => {
    if (!selectedTermoId || mode !== 'mes') return;
    let cancelled = false;
    setLoading(true);
    setData10(null);
    setData11(null);
    fsLoadRegistro(selectedTermoId, selectedYear, selectedMonth)
      .then(registro => {
        if (cancelled) return;
        if (isAmbiental) { setData10(registro as Anexo10Data | null); setData11(null); }
        else { setData11(registro as Anexo11Data | null); setData10(null); }
      })
      .catch(() => { if (!cancelled) alert('Error al cargar datos del reporte.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [selectedTermoId, selectedYear, selectedMonth, isAmbiental, mode]);

  // Load range data
  useEffect(() => {
    if (!selectedTermoId || mode !== 'rango') return;
    let cancelled = false;
    setRangeLoading(true);
    setRangeData([]);

    // Build list of year/month pairs in range
    const months: { year: number; month: number }[] = [];
    let y = rangeFromYear, m = rangeFromMonth;
    while (y < rangeToYear || (y === rangeToYear && m <= rangeToMonth)) {
      months.push({ year: y, month: m });
      m++;
      if (m > 12) { m = 1; y++; }
      if (months.length > 36) break; // safety cap
    }

    Promise.all(months.map(({ year, month }) =>
      fsLoadRegistro(selectedTermoId, year, month).then(reg => ({ year, month, reg }))
    )).then(results => {
      if (cancelled) return;
      const points: RangePoint[] = results.map(({ year, month, reg }) => {
        const label = `${MESES[month - 1].slice(0, 3)} ${year}`;
        if (!reg) return { label, promManana: undefined, promTarde: undefined, promHumManana: undefined, promHumTarde: undefined };

        const entries = isAmbiental
          ? (reg as Anexo10Data).entries ?? []
          : (reg as Anexo11Data).entries ?? [];

        const tempMananas = entries.map(e => e.tempManana ? parseFloat(e.tempManana) : null).filter((v): v is number => v !== null);
        const tempTardes = entries.map(e => e.tempTarde ? parseFloat(e.tempTarde) : null).filter((v): v is number => v !== null);
        const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : undefined;

        const point: RangePoint = {
          label,
          promManana: avg(tempMananas),
          promTarde: avg(tempTardes),
        };

        if (isAmbiental) {
          const humMananas = (reg as Anexo10Data).entries.map(e => e.humManana ? parseFloat(e.humManana) : null).filter((v): v is number => v !== null);
          const humTardes = (reg as Anexo10Data).entries.map(e => e.humTarde ? parseFloat(e.humTarde) : null).filter((v): v is number => v !== null);
          point.promHumManana = avg(humMananas);
          point.promHumTarde = avg(humTardes);
        }

        return point;
      });
      setRangeData(points);
    }).catch(() => { if (!cancelled) alert('Error al cargar datos del rango.'); })
      .finally(() => { if (!cancelled) setRangeLoading(false); });

    return () => { cancelled = true; };
  }, [selectedTermoId, rangeFromYear, rangeFromMonth, rangeToYear, rangeToMonth, isAmbiental, mode]);

  // Available years
  const years = useMemo(() => {
    const ys = Array.from(new Set([now.getFullYear(), now.getFullYear() - 1, now.getFullYear() + 1, ...monthsWithData.map(m => m.year)]));
    return ys.sort((a, b) => b - a);
  }, [monthsWithData]);

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

  const rangeHasData = rangeData.some(p => p.promManana !== undefined || p.promTarde !== undefined);

  return (
    <div className="space-y-5">
      {/* ─── Selectors ─── */}
      <div className="bg-white rounded-xl border border-blue-100 shadow-sm p-4">
        {/* Mode toggle */}
        <div className="flex gap-2 mb-4">
          {(['mes', 'rango'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${mode === m ? 'bg-blue-700 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
            >
              {m === 'mes' ? '📅 Por mes' : '📆 Rango de meses'}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-4 items-end">
          {/* Equipo */}
          <div className="flex-1 min-w-48">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Equipo</label>
            <select
              value={selectedTermoId}
              onChange={e => setSelectedTermoId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {[...termos].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')).map(t => (
                <option key={t.id} value={t.id}>
                  {t.nombre}{t.numero ? ` — N° ${t.numero}` : ''}{t.ubicacion ? ` (${t.ubicacion})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Mes mode selectors */}
          {mode === 'mes' && <>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Año</label>
              <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Mes</label>
              <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                {MESES.map((m, i) => {
                  const hasD = monthsWithData.some(d => d.year === selectedYear && d.month === i + 1);
                  return <option key={i + 1} value={i + 1}>{m}{hasD ? ' ●' : ''}</option>;
                })}
              </select>
            </div>
          </>}

          {/* Rango mode selectors */}
          {mode === 'rango' && <>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Desde</label>
              <div className="flex gap-1">
                <select value={rangeFromMonth} onChange={e => setRangeFromMonth(parseInt(e.target.value))}
                  className="border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                  {MESES.map((m, i) => <option key={i + 1} value={i + 1}>{m.slice(0, 3)}</option>)}
                </select>
                <select value={rangeFromYear} onChange={e => setRangeFromYear(parseInt(e.target.value))}
                  className="border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Hasta</label>
              <div className="flex gap-1">
                <select value={rangeToMonth} onChange={e => setRangeToMonth(parseInt(e.target.value))}
                  className="border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                  {MESES.map((m, i) => <option key={i + 1} value={i + 1}>{m.slice(0, 3)}</option>)}
                </select>
                <select value={rangeToYear} onChange={e => setRangeToYear(parseInt(e.target.value))}
                  className="border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
          </>}

          {/* Info badge */}
          {termo && (
            <div className={`px-3 py-2 rounded-lg text-xs font-semibold ${isAmbiental ? 'bg-blue-100 text-blue-800' : 'bg-teal-100 text-teal-800'}`}>
              {isAmbiental ? '🌡️ Temperatura Ambiental' : '❄️ Refrigeración'}
            </div>
          )}
        </div>
      </div>

      {/* ─── Rango mode ─── */}
      {mode === 'rango' && (
        rangeLoading ? (
          <div className="flex items-center justify-center py-20"><p className="text-blue-600">Cargando rango...</p></div>
        ) : !rangeHasData ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400 bg-white rounded-xl border border-blue-100">
            <div className="text-4xl mb-3">📭</div>
            <p className="font-semibold text-gray-600">Sin datos para el rango seleccionado</p>
          </div>
        ) : (
          <div ref={printRef} className="space-y-5">
            {/* Print header rango */}
            <div className="print-only" style={{ display: 'none' }}>
              <div style={{ background: 'linear-gradient(90deg, #0f766e, #0d9488)', padding: '18px 28px 14px' }}>
                <div style={{ color: 'white', fontSize: '10px', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', opacity: 0.85, marginBottom: '4px' }}>
                  Clínica Renal El Puyo — VIVENS
                </div>
                <div style={{ color: 'white', fontSize: '20px', fontWeight: 800, lineHeight: 1.2 }}>
                  Análisis de Comportamiento — {isAmbiental ? 'Temperatura y Humedad Ambiental' : 'Temperatura de Refrigeración'}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '10px', marginTop: '6px' }}>
                  {MESES[rangeFromMonth - 1]} {rangeFromYear} — {MESES[rangeToMonth - 1]} {rangeToYear} · {termo?.nombre}{termo?.numero ? ` · N° ${termo.numero}` : ''}
                </div>
              </div>
              <div style={{ background: '#f0fdfa', borderBottom: '1.5px solid #99f6e4', padding: '8px 28px', display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: '#134e4a' }}>
                <span><strong>Equipo:</strong> {termo?.nombre}{termo?.numero ? ` (N° ${termo.numero})` : ''}</span>
                <span><strong>Tipo:</strong> {isAmbiental ? 'Temperatura y Humedad Ambiental' : 'Refrigeración'}</span>
                <span><strong>Rango:</strong> {MESES[rangeFromMonth - 1]} {rangeFromYear} — {MESES[rangeToMonth - 1]} {rangeToYear}</span>
                {termo?.ubicacion && <span><strong>Ubicación:</strong> {termo.ubicacion}</span>}
              </div>
            </div>

            {/* Botón imprimir */}
            <div className="flex justify-end no-print">
              <button onClick={() => handlePrint()}
                className="text-xs bg-blue-700 hover:bg-blue-800 text-white px-3 py-1.5 rounded-lg font-semibold transition-colors">
                🖨️ Imprimir reporte
              </button>
            </div>

            {/* Gráfico temperatura rango */}
            <div className="bg-white rounded-xl border border-blue-100 shadow-sm p-4">
              <h3 className="text-sm font-bold text-blue-900 mb-4">
                Promedio de Temperatura por Mes — {MESES[rangeFromMonth - 1]} {rangeFromYear} a {MESES[rangeToMonth - 1]} {rangeToYear}
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={rangeData} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis unit="°C" tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                  <Tooltip formatter={(v: unknown) => `${(v as number).toFixed(1)}°C`} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {isAmbiental
                    ? <ReferenceLine y={30} stroke="#ef4444" strokeDasharray="5 3" label={{ value: 'Límite 30°C', fill: '#ef4444', fontSize: 10 }} />
                    : <>
                        <ReferenceLine y={8} stroke="#ef4444" strokeDasharray="5 3" label={{ value: 'Máx 8°C', fill: '#ef4444', fontSize: 10 }} />
                        <ReferenceLine y={2} stroke="#f97316" strokeDasharray="5 3" label={{ value: 'Mín 2°C', fill: '#f97316', fontSize: 10 }} />
                      </>
                  }
                  <Line type="monotone" dataKey="promManana" name="Prom. Mañana" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} connectNulls={false} />
                  <Line type="monotone" dataKey="promTarde" name="Prom. Tarde" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} connectNulls={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Gráfico humedad rango */}
            {isAmbiental && rangeData.some(p => p.promHumManana !== undefined) && (
              <div className="bg-white rounded-xl border border-blue-100 shadow-sm p-4">
                <h3 className="text-sm font-bold text-blue-900 mb-4">
                  Promedio de Humedad Relativa por Mes — {MESES[rangeFromMonth - 1]} {rangeFromYear} a {MESES[rangeToMonth - 1]} {rangeToYear}
                </h3>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={rangeData} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis unit="%" tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                    <Tooltip formatter={(v: unknown) => `${(v as number).toFixed(1)}%`} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="5 3" label={{ value: 'Límite 70%', fill: '#ef4444', fontSize: 10 }} />
                    <Line type="monotone" dataKey="promHumManana" name="Prom. Mañana" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} connectNulls={false} />
                    <Line type="monotone" dataKey="promHumTarde" name="Prom. Tarde" stroke="#ec4899" strokeWidth={2} dot={{ r: 4 }} connectNulls={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Tabla resumen por mes */}
            <div className="bg-white rounded-xl border border-blue-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-blue-50">
                <h3 className="text-sm font-bold text-blue-900">Resumen por mes</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-blue-50 text-blue-900 font-semibold">
                    <tr>
                      <th className="px-3 py-2 text-left">Mes</th>
                      <th className="px-3 py-2 text-center">T° Prom. Mañana</th>
                      <th className="px-3 py-2 text-center">T° Prom. Tarde</th>
                      {isAmbiental && <>
                        <th className="px-3 py-2 text-center">HR Prom. Mañana</th>
                        <th className="px-3 py-2 text-center">HR Prom. Tarde</th>
                      </>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {rangeData.map(p => (
                      <tr key={p.label} className="hover:bg-gray-50">
                        <td className="px-3 py-1.5 font-semibold text-gray-700">{p.label}</td>
                        <td className="px-3 py-1.5 text-center">{p.promManana !== undefined ? `${p.promManana.toFixed(1)}°C` : '—'}</td>
                        <td className="px-3 py-1.5 text-center">{p.promTarde !== undefined ? `${p.promTarde.toFixed(1)}°C` : '—'}</td>
                        {isAmbiental && <>
                          <td className="px-3 py-1.5 text-center">{p.promHumManana !== undefined ? `${p.promHumManana.toFixed(1)}%` : '—'}</td>
                          <td className="px-3 py-1.5 text-center">{p.promHumTarde !== undefined ? `${p.promHumTarde.toFixed(1)}%` : '—'}</td>
                        </>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      )}

      {mode === 'mes' && (loading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-blue-600">Cargando...</p>
        </div>
      ) : !hasData ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400 bg-white rounded-xl border border-blue-100">
          <div className="text-4xl mb-3">📭</div>
          <p className="font-semibold text-gray-600">Sin datos para {MESES[selectedMonth - 1]} {selectedYear}</p>
          <p className="text-sm mt-1">Ingresa registros de temperatura en la pantalla del equipo</p>
        </div>
      ) : (
        <div ref={printRef} className="space-y-5">

          {/* ─── Encabezado profesional (solo en impresión) ─── */}
          {(() => {
            const footer = isAmbiental ? data10?.footer : data11?.footer;
            const validador = footer?.revisadoPor?.trim() || '';
            const cargo = footer?.cargo?.trim() || '';
            const fecha = footer?.fecha?.trim() || '';
            const qrContent = [
              `Equipo: ${termo?.nombre ?? ''}`,
              termo?.numero ? `N° Serie: ${termo.numero}` : '',
              `Período: ${MESES[selectedMonth - 1]} ${selectedYear}`,
              `Tipo: ${isAmbiental ? 'Temperatura Ambiental' : 'Refrigeración'}`,
              validador ? `Validado por: ${validador}` : '',
              cargo ? `Cargo: ${cargo}` : '',
              fecha ? `Fecha validación: ${fecha}` : '',
            ].filter(Boolean).join('\n');

            return (
              <div className="print-only" style={{ display: 'none' }}>
                {/* Franja teal superior */}
                <div style={{ background: 'linear-gradient(90deg, #0f766e, #0d9488)', padding: '18px 28px 14px', marginBottom: 0 }}>
                  <div style={{ color: 'white', fontSize: '10px', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', opacity: 0.85, marginBottom: '4px' }}>
                    Clínica Renal El Puyo — VIVENS
                  </div>
                  <div style={{ color: 'white', fontSize: '20px', fontWeight: 800, letterSpacing: '0.5px', lineHeight: 1.2 }}>
                    Reporte {isAmbiental ? 'de Temperatura y Humedad Ambiental' : 'de Temperatura de Refrigeración'}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '10px', marginTop: '6px' }}>
                    {MESES[selectedMonth - 1]} {selectedYear} · {termo?.nombre}{termo?.numero ? ` · N° ${termo.numero}` : ''}{termo?.ubicacion ? ` · ${termo.ubicacion}` : ''}
                  </div>
                </div>

                {/* Línea divisoria con info del equipo */}
                <div style={{ background: '#f0fdfa', borderBottom: '1.5px solid #99f6e4', padding: '8px 28px', display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: '#134e4a' }}>
                  <span><strong>Equipo:</strong> {termo?.nombre}{termo?.numero ? ` (N° ${termo.numero})` : ''}</span>
                  <span><strong>Tipo:</strong> {isAmbiental ? 'Temperatura y Humedad Ambiental' : 'Refrigeración'}</span>
                  <span><strong>Período:</strong> {MESES[selectedMonth - 1]} {selectedYear}</span>
                  {termo?.ubicacion && <span><strong>Ubicación:</strong> {termo.ubicacion}</span>}
                </div>

                {/* Pie con validador y QR */}
                {(validador || cargo || fecha) && (
                  <div style={{ marginTop: '20px', borderTop: '1.5px solid #99f6e4', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '12px 28px 0' }}>
                    <div>
                      <div style={{ fontSize: '7px', fontWeight: 700, color: '#0f766e', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
                        Validado por
                      </div>
                      {validador && (
                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#134e4a', borderBottom: '1px solid #134e4a', paddingBottom: '2px', minWidth: '160px' }}>
                          {validador}
                        </div>
                      )}
                      {cargo && <div style={{ fontSize: '8px', color: '#374151', marginTop: '3px' }}>{cargo}</div>}
                      {fecha && <div style={{ fontSize: '8px', color: '#6b7280', marginTop: '2px' }}>Fecha: {fecha}</div>}
                    </div>
                    {qrContent && (
                      <div style={{ textAlign: 'center' }}>
                        <QRCodeSVG value={qrContent} size={72} level="M" />
                        <div style={{ fontSize: '6px', color: '#6b7280', marginTop: '3px' }}>Información del reporte</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

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
                onClick={() => handlePrint()}
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
      ))}
    </div>
  );
}
