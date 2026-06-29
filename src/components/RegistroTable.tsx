import { useEffect, useRef } from 'react';
import { DailyEntry, RefrigDailyEntry } from '../types';
import {
  calcProm,
  monthlyAverage,
  isOutOfRangeTemp10,
  isOutOfRangeHum10,
  isOutOfRangeTemp11,
} from '../utils/calculations';

function cellCls(outOfRange: boolean) {
  return outOfRange ? 'bg-red-100 text-red-700 font-semibold' : '';
}

// ─── Shared footer ────────────────────────────────────────────────────────────

function FooterFields({ footer, onFooterChange, readOnly }: {
  footer: { revisadoPor: string; cargo: string; fecha: string };
  onFooterChange: (f: { revisadoPor: string; cargo: string; fecha: string }) => void;
  readOnly?: boolean;
}) {
  const fechaDisplay = footer.fecha
    ? new Date(footer.fecha + 'T12:00:00').toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' })
    : '';

  return (
    <>
      {/* Screen: inputs */}
      <div className="footer-screen mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        {(['revisadoPor', 'cargo', 'fecha'] as const).map(k => (
          <div key={k} className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-teal-800 uppercase tracking-wide">
              {k === 'revisadoPor' ? 'Revisado por' : k === 'cargo' ? 'Cargo' : 'Fecha'}
            </label>
            <input
              className={`border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 ${readOnly ? 'border-gray-100 bg-gray-50 text-gray-500 cursor-not-allowed' : 'border-teal-200'}`}
              value={footer[k]}
              onChange={e => !readOnly && onFooterChange({ ...footer, [k]: e.target.value })}
              type={k === 'fecha' ? 'date' : 'text'}
              readOnly={readOnly}
            />
          </div>
        ))}
      </div>

      {/* Print: professional signature block */}
      <div className="footer-print hidden" style={{
        marginTop: '12px',
        borderTop: '2px solid #0f766e',
        paddingTop: '10px',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        gap: '0',
      }}>
        {/* Left: Responsable */}
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ height: '32px' }} />{/* space for physical signature */}
          <div style={{ borderTop: '1px solid #134e4a', width: '75%', margin: '0 auto 4px' }} />
          <div style={{ fontSize: '8px', fontWeight: 700, color: '#134e4a' }}>{footer.revisadoPor || '________________________'}</div>
          {footer.cargo && <div style={{ fontSize: '7px', color: '#0f766e', marginTop: '1px' }}>{footer.cargo}</div>}
          <div style={{ fontSize: '6.5px', color: '#9ca3af', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Revisado y aprobado por</div>
        </div>

        {/* Center: Institution */}
        <div style={{ textAlign: 'center', flex: 1, paddingBottom: '4px' }}>
          <div style={{
            display: 'inline-block',
            background: '#f0fdf4',
            border: '1px solid #99f6e4',
            borderRadius: '4px',
            padding: '6px 12px',
            marginBottom: '4px',
          }}>
            <div style={{ fontSize: '8px', fontWeight: 800, color: '#0f766e' }}>VIVENS</div>
            <div style={{ fontSize: '6.5px', color: '#134e4a' }}>Clínica Renal El Puyo</div>
          </div>
          <div style={{ fontSize: '6.5px', color: '#9ca3af' }}>Control de Temperatura y Humedad</div>
          <div style={{ fontSize: '6px', color: '#d1d5db', marginTop: '1px' }}>Desarrollado por Alex Naranjo</div>
        </div>

        {/* Right: Date */}
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ height: '32px' }} />{/* space for physical date/stamp */}
          <div style={{ borderTop: '1px solid #134e4a', width: '75%', margin: '0 auto 4px' }} />
          <div style={{ fontSize: '8px', fontWeight: 700, color: '#134e4a' }}>{fechaDisplay || '________________________'}</div>
          <div style={{ fontSize: '6.5px', color: '#9ca3af', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Fecha de revisión</div>
        </div>
      </div>
    </>
  );
}

// ─── Anexo 10 ─────────────────────────────────────────────────────────────────

interface Anexo10TableProps {
  entries: DailyEntry[];
  onChange: (entries: DailyEntry[]) => void;
  footer: { revisadoPor: string; cargo: string; fecha: string };
  onFooterChange: (f: { revisadoPor: string; cargo: string; fecha: string }) => void;
  lockedDays: Set<number>;
  onLockedDaysChange: (locked: Set<number>) => void;
  currentUserName?: string;
  canUnlock?: boolean;
  year: number;
  month: number;
  validated?: boolean;
  exceptionalDays?: string[];
}

function rowAlert(e: DailyEntry): boolean {
  return (
    isOutOfRangeTemp10(e.tempManana) || isOutOfRangeTemp10(e.tempTarde) ||
    isOutOfRangeHum10(e.humManana) || isOutOfRangeHum10(e.humTarde) ||
    isOutOfRangeTemp10(calcProm(e.tempManana, e.tempTarde)) ||
    isOutOfRangeHum10(calcProm(e.humManana, e.humTarde))
  );
}

export function Anexo10Table({ entries, onChange, footer, onFooterChange, lockedDays, onLockedDaysChange, currentUserName, canUnlock, year, month, validated, exceptionalDays = [] }: Anexo10TableProps) {
  const now = new Date();
  const todayDay = (year === now.getFullYear() && month === now.getMonth() + 1) ? now.getDate() : null;
  const todayRef = useRef<HTMLDivElement>(null);
  useEffect(() => { todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, []);

  const isWeekend = (dia: number) => { const d = new Date(year, month - 1, dia).getDay(); return d === 0 || d === 6; };
  const isoDate = (dia: number) => `${year}-${String(month).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
  const isExceptional = (dia: number) => exceptionalDays.includes(isoDate(dia));
  const dayLabel = (dia: number) => { const d = new Date(year, month - 1, dia).getDay(); return d === 6 ? 'Sáb' : d === 0 ? 'Dom' : null; };
  const update = (i: number, field: keyof DailyEntry, val: string) => {
    const tsField = (field === 'tempManana' || field === 'humManana') ? 'tsManana'
                  : (field === 'tempTarde' || field === 'humTarde') ? 'tsTarde'
                  : null;
    onChange(entries.map((e, idx) =>
      idx === i ? { ...e, [field]: val, ...(tsField && val !== '' ? { [tsField]: Date.now() } : {}) } : e
    ));
  };

  const toggleLock = (dia: number) => {
    const isLocked = lockedDays.has(dia);
    if (isLocked) {
      if (!canUnlock) { alert('Solo un administrador o validador puede desbloquear un día confirmado.'); return; }
      if (!window.confirm('¿Deseas editar este día?')) return;
      const next = new Set(lockedDays); next.delete(dia); onLockedDaysChange(next);
    } else {
      const idx = entries.findIndex(e => e.dia === dia);
      if (idx !== -1 && currentUserName) {
        onChange(entries.map((e, i) => i === idx ? { ...e, nombre: currentUserName } : e));
      }
      const next = new Set(lockedDays); next.add(dia); onLockedDaysChange(next);
    }
  };

  const avgTempM = monthlyAverage(entries.map(e => e.tempManana));
  const avgTempT = monthlyAverage(entries.map(e => e.tempTarde));
  const avgTempP = monthlyAverage(entries.map(e => calcProm(e.tempManana, e.tempTarde)));
  const avgHumM  = monthlyAverage(entries.map(e => e.humManana));
  const avgHumT  = monthlyAverage(entries.map(e => e.humTarde));
  const avgHumP  = monthlyAverage(entries.map(e => calcProm(e.humManana, e.humTarde)));

  const inputNum = 'w-full bg-transparent text-center text-sm focus:outline-none focus:bg-teal-50 rounded px-1 py-1';
  const inputTxt = 'w-full bg-transparent text-sm focus:outline-none focus:bg-teal-50 rounded px-1 py-1';
  const thCls = 'px-2 py-2 text-xs font-bold text-teal-900 bg-teal-50 border border-teal-200 text-center whitespace-nowrap';
  const tdCls = 'border border-teal-100 px-1 py-0.5';

  return (
    <div>
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 mb-3 text-xs text-gray-600 no-print">
        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-200 inline-block"/>Fuera de rango</span>
        <span>Temp MÁX: <strong>30°C</strong> · Humedad MÁX: <strong>70%</strong></span>
        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-100 border border-gray-300 inline-block"/>Día confirmado</span>
      </div>

      {/* ── MOBILE: card per day ── */}
      <div className="mobile-cards md:hidden space-y-2 no-print">
        {entries.map((e, i) => {
          const tProm = calcProm(e.tempManana, e.tempTarde);
          const hProm = calcProm(e.humManana, e.humTarde);
          const locked = lockedDays.has(e.dia);
          const alert = rowAlert(e);
          const weekend = isWeekend(e.dia);
          const label = dayLabel(e.dia);
          const isToday = e.dia === todayDay;
          const cardBg = locked ? 'bg-gray-50 border-gray-200' : alert ? 'bg-red-50 border-red-300' : weekend ? 'bg-slate-100 border-slate-200' : 'bg-white border-teal-100';
          return (
            <div key={e.dia} ref={isToday ? todayRef : undefined} className={`rounded-xl border ${cardBg} overflow-hidden`}>
              {/* Day header */}
              <div className={`flex items-center justify-between px-4 py-2 ${locked ? 'bg-gray-100' : alert ? 'bg-red-100' : weekend ? 'bg-slate-200' : 'bg-teal-50'}`}>
                <span className={`font-bold text-base ${weekend ? 'text-slate-500' : 'text-teal-900'}`}>
                  Día {e.dia}{label && <span className="ml-1.5 text-xs font-semibold uppercase tracking-wide opacity-70">{label}</span>}
                </span>
                <div className="flex items-center gap-2">
                  {alert && !locked && <span className="text-xs text-red-600 font-semibold">⚠ Fuera de rango</span>}
                  {locked && <span className="text-xs text-gray-500">Confirmado</span>}
                  <button
                    onClick={() => toggleLock(e.dia)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${locked ? 'bg-gray-200 text-gray-600 active:bg-gray-300' : 'bg-teal-600 text-white active:bg-teal-700'}`}
                  >
                    {locked ? '🔒 Editar' : '✓ Confirmar'}
                  </button>
                </div>
              </div>

              <div className="px-4 py-3 space-y-3">
                {/* Temperatura */}
                <div>
                  <p className="text-xs font-bold text-teal-700 uppercase tracking-wide mb-1.5">Temperatura (°C) — MÁX 30°C</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[['Mañana', 'tempManana', isOutOfRangeTemp10(e.tempManana)], ['Tarde', 'tempTarde', isOutOfRangeTemp10(e.tempTarde)], ['Prom', null, isOutOfRangeTemp10(tProm)]].map(([label, field, oor]) => (
                      <div key={label as string} className={`rounded-lg p-2 text-center ${oor ? 'bg-red-100' : 'bg-gray-50'}`}>
                        <p className="text-xs text-gray-500 mb-1">{label as string}</p>
                        {field && !locked ? (
                          <input type="number" step="0.1" value={e[field as keyof DailyEntry]}
                            onChange={ev => update(i, field as keyof DailyEntry, ev.target.value)}
                            className={`w-full text-center text-base font-semibold bg-transparent focus:outline-none ${oor ? 'text-red-700' : 'text-gray-800'}`}
                            inputMode="decimal"
                          />
                        ) : (
                          <p className={`text-base font-semibold ${oor ? 'text-red-700' : 'text-gray-800'}`}>{field ? e[field as keyof DailyEntry] : tProm}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Humedad */}
                <div>
                  <p className="text-xs font-bold text-teal-700 uppercase tracking-wide mb-1.5">Humedad (%) — MÁX 70%</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[['Mañana', 'humManana', isOutOfRangeHum10(e.humManana)], ['Tarde', 'humTarde', isOutOfRangeHum10(e.humTarde)], ['Prom', null, isOutOfRangeHum10(hProm)]].map(([label, field, oor]) => (
                      <div key={label as string} className={`rounded-lg p-2 text-center ${oor ? 'bg-red-100' : 'bg-gray-50'}`}>
                        <p className="text-xs text-gray-500 mb-1">{label as string}</p>
                        {field && !locked ? (
                          <input type="number" step="0.1" value={e[field as keyof DailyEntry]}
                            onChange={ev => update(i, field as keyof DailyEntry, ev.target.value)}
                            className={`w-full text-center text-base font-semibold bg-transparent focus:outline-none ${oor ? 'text-red-700' : 'text-gray-800'}`}
                            inputMode="decimal"
                          />
                        ) : (
                          <p className={`text-base font-semibold ${oor ? 'text-red-700' : 'text-gray-800'}`}>{field ? e[field as keyof DailyEntry] : hProm}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Nombre y Observaciones */}
                <div className="grid grid-cols-1 gap-2">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Nombre / Firma responsable</p>
                    {locked ? (
                      <p className="text-sm text-gray-700 px-2 py-1.5 bg-gray-50 rounded-lg">{e.nombre || '—'}</p>
                    ) : (
                      <input value={e.nombre} onChange={ev => update(i, 'nombre', ev.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                        placeholder="Nombre del responsable" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Observaciones</p>
                    {locked ? (
                      <p className="text-sm text-gray-700 px-2 py-1.5 bg-gray-50 rounded-lg">{e.observaciones || '—'}</p>
                    ) : (
                      <input value={e.observaciones} onChange={ev => update(i, 'observaciones', ev.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                        placeholder="Observaciones" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Monthly avg mobile */}
        <div className="rounded-xl bg-teal-700 text-white p-4">
          <p className="text-xs font-bold uppercase tracking-wide mb-2">Promedio del mes</p>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div><p className="text-teal-200 text-xs">T. Mañana</p><p className="font-bold">{avgTempM}</p></div>
            <div><p className="text-teal-200 text-xs">T. Tarde</p><p className="font-bold">{avgTempT}</p></div>
            <div><p className="text-teal-200 text-xs">T. Prom</p><p className="font-bold">{avgTempP}</p></div>
            <div><p className="text-teal-200 text-xs">H. Mañana</p><p className="font-bold">{avgHumM}</p></div>
            <div><p className="text-teal-200 text-xs">H. Tarde</p><p className="font-bold">{avgHumT}</p></div>
            <div><p className="text-teal-200 text-xs">H. Prom</p><p className="font-bold">{avgHumP}</p></div>
          </div>
        </div>
      </div>

      {/* ── DESKTOP: table ── */}
      <div className="desktop-table hidden md:block overflow-x-auto">
        <table className="w-full border-collapse text-sm min-w-[960px]">
          <thead>
            <tr>
              <th className={thCls} rowSpan={2}>DÍA</th>
              <th className={thCls} colSpan={3}>TEMPERATURA (°C) — MÁX 30°C</th>
              <th className={thCls} colSpan={3}>HUMEDAD (%) — MÁX 70%</th>
              <th className={thCls} rowSpan={2}>NOMBRE / FIRMA<br/>RESPONSABLE</th>
              <th className={thCls} rowSpan={2}>OBSERVACIONES</th>
              <th className={`${thCls} no-print`} rowSpan={2}>✓</th>
            </tr>
            <tr>
              {['MAÑANA','TARDE','PROM','MAÑANA','TARDE','PROM'].map((h,i) => <th key={i} className={thCls}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => {
              const tProm = calcProm(e.tempManana, e.tempTarde);
              const hProm = calcProm(e.humManana, e.humTarde);
              const alert = rowAlert(e);
              const locked = lockedDays.has(e.dia);
              const weekend = isWeekend(e.dia);
              const exceptional = isExceptional(e.dia);
              const label = dayLabel(e.dia);
              const effectiveLocked = locked || !!validated;
              const rowBg = effectiveLocked ? 'bg-gray-50' : alert ? 'bg-red-50' : (weekend || exceptional) ? 'bg-slate-100' : i % 2 === 0 ? 'bg-white' : 'bg-teal-50/20';
              return (
                <tr key={e.dia} className={rowBg}>
                  <td className={`${tdCls} text-center font-medium w-10 ${(weekend || exceptional) ? 'text-slate-400' : 'text-teal-800'}`}>
                    <div className="flex flex-col items-center leading-tight">
                      <span>{e.dia}</span>
                      {label && <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">{label}</span>}
                      {exceptional && !label && <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">NL</span>}
                    </div>
                  </td>
                  {(['tempManana','tempTarde'] as const).map(f => (
                    <td key={f} className={`${tdCls} ${cellCls(isOutOfRangeTemp10(e[f]))} w-20`}>
                      {effectiveLocked ? <span className="block text-center text-sm px-1">{e[f]}</span>
                        : <input className={inputNum} type="number" step="0.1" value={e[f]} onChange={ev => update(i, f, ev.target.value)} />}
                    </td>
                  ))}
                  <td className={`${tdCls} ${cellCls(isOutOfRangeTemp10(tProm))} w-20 text-center text-gray-700`}>{tProm}</td>
                  {(['humManana','humTarde'] as const).map(f => (
                    <td key={f} className={`${tdCls} ${cellCls(isOutOfRangeHum10(e[f]))} w-20`}>
                      {effectiveLocked ? <span className="block text-center text-sm px-1">{e[f]}</span>
                        : <input className={inputNum} type="number" step="0.1" value={e[f]} onChange={ev => update(i, f, ev.target.value)} />}
                    </td>
                  ))}
                  <td className={`${tdCls} ${cellCls(isOutOfRangeHum10(hProm))} w-20 text-center text-gray-700`}>{hProm}</td>
                  <td className={tdCls}>
                    {effectiveLocked ? <span className="block text-sm px-1">{e.nombre}</span>
                      : <input className={inputTxt} value={e.nombre} onChange={ev => update(i, 'nombre', ev.target.value)} />}
                  </td>
                  <td className={tdCls}>
                    {effectiveLocked ? <span className="block text-sm px-1">{e.observaciones}</span>
                      : <input className={inputTxt} value={e.observaciones} onChange={ev => update(i, 'observaciones', ev.target.value)} />}
                  </td>
                  <td className={`${tdCls} text-center no-print w-10`}>
                    {!validated && (
                      <button onClick={() => toggleLock(e.dia)} title={locked ? 'Clic para editar' : 'Confirmar día'}
                        className={`text-base transition-opacity hover:opacity-70 ${locked ? 'text-gray-500' : 'text-teal-600'}`}>
                        {locked ? '🔒' : '✓'}
                      </button>
                    )}
                    {validated && <span className="text-gray-400 text-base">🔒</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-teal-100 font-semibold">
              <td className={`${tdCls} text-center text-xs font-bold text-teal-900`}>PROM.<br/>MES</td>
              <td className={`${tdCls} text-center ${cellCls(isOutOfRangeTemp10(avgTempM))}`}>{avgTempM}</td>
              <td className={`${tdCls} text-center ${cellCls(isOutOfRangeTemp10(avgTempT))}`}>{avgTempT}</td>
              <td className={`${tdCls} text-center ${cellCls(isOutOfRangeTemp10(avgTempP))}`}>{avgTempP}</td>
              <td className={`${tdCls} text-center ${cellCls(isOutOfRangeHum10(avgHumM))}`}>{avgHumM}</td>
              <td className={`${tdCls} text-center ${cellCls(isOutOfRangeHum10(avgHumT))}`}>{avgHumT}</td>
              <td className={`${tdCls} text-center ${cellCls(isOutOfRangeHum10(avgHumP))}`}>{avgHumP}</td>
              <td className={tdCls}/><td className={tdCls}/><td className={`${tdCls} no-print`}/>
            </tr>
          </tfoot>
        </table>
      </div>

      <FooterFields footer={footer} onFooterChange={onFooterChange} readOnly={validated} />
    </div>
  );
}

// ─── Anexo 11 ─────────────────────────────────────────────────────────────────

interface Anexo11TableProps {
  entries: RefrigDailyEntry[];
  onChange: (entries: RefrigDailyEntry[]) => void;
  footer: { revisadoPor: string; cargo: string; fecha: string };
  onFooterChange: (f: { revisadoPor: string; cargo: string; fecha: string }) => void;
  lockedDays: Set<number>;
  onLockedDaysChange: (locked: Set<number>) => void;
  currentUserName?: string;
  canUnlock?: boolean;
  year: number;
  month: number;
  validated?: boolean;
  exceptionalDays?: string[];
}

function rowAlert11(e: RefrigDailyEntry): boolean {
  return isOutOfRangeTemp11(e.tempManana) || isOutOfRangeTemp11(e.tempTarde) ||
    isOutOfRangeTemp11(calcProm(e.tempManana, e.tempTarde));
}

export function Anexo11Table({ entries, onChange, footer, onFooterChange, lockedDays, onLockedDaysChange, currentUserName, canUnlock, year, month, validated, exceptionalDays = [] }: Anexo11TableProps) {
  const now = new Date();
  const todayDay = (year === now.getFullYear() && month === now.getMonth() + 1) ? now.getDate() : null;
  const todayRef = useRef<HTMLDivElement>(null);
  useEffect(() => { todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, []);

  const isWeekend = (dia: number) => { const d = new Date(year, month - 1, dia).getDay(); return d === 0 || d === 6; };
  const isoDate = (dia: number) => `${year}-${String(month).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
  const isExceptional = (dia: number) => exceptionalDays.includes(isoDate(dia));
  const dayLabel = (dia: number) => { const d = new Date(year, month - 1, dia).getDay(); return d === 6 ? 'Sáb' : d === 0 ? 'Dom' : null; };
  const update = (i: number, field: keyof RefrigDailyEntry, val: string) => {
    const tsField = field === 'tempManana' ? 'tsManana' : field === 'tempTarde' ? 'tsTarde' : null;
    onChange(entries.map((e, idx) =>
      idx === i ? { ...e, [field]: val, ...(tsField && val !== '' ? { [tsField]: Date.now() } : {}) } : e
    ));
  };

  const toggleLock = (dia: number) => {
    const isLocked = lockedDays.has(dia);
    if (isLocked) {
      if (!canUnlock) { alert('Solo un administrador o validador puede desbloquear un día confirmado.'); return; }
      if (!window.confirm('¿Deseas editar este día?')) return;
      const next = new Set(lockedDays); next.delete(dia); onLockedDaysChange(next);
    } else {
      const idx = entries.findIndex(e => e.dia === dia);
      if (idx !== -1 && currentUserName) {
        onChange(entries.map((e, i) => i === idx ? { ...e, nombre: currentUserName } : e));
      }
      const next = new Set(lockedDays); next.add(dia); onLockedDaysChange(next);
    }
  };

  const avgTempM = monthlyAverage(entries.map(e => e.tempManana));
  const avgTempT = monthlyAverage(entries.map(e => e.tempTarde));
  const avgTempP = monthlyAverage(entries.map(e => calcProm(e.tempManana, e.tempTarde)));

  const inputNum = 'w-full bg-transparent text-center text-sm focus:outline-none focus:bg-teal-50 rounded px-1 py-1';
  const inputTxt = 'w-full bg-transparent text-sm focus:outline-none focus:bg-teal-50 rounded px-1 py-1';
  const thCls = 'px-2 py-2 text-xs font-bold text-teal-900 bg-teal-50 border border-teal-200 text-center whitespace-nowrap';
  const tdCls = 'border border-teal-100 px-1 py-0.5';

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-3 text-xs text-gray-600 no-print">
        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-200 inline-block"/>Fuera de rango</span>
        <span>Rango temp: <strong>2–8°C</strong></span>
        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-100 border border-gray-300 inline-block"/>Día confirmado</span>
      </div>

      {/* ── MOBILE cards ── */}
      <div className="mobile-cards md:hidden space-y-2 no-print">
        {entries.map((e, i) => {
          const tProm = calcProm(e.tempManana, e.tempTarde);
          const locked = lockedDays.has(e.dia);
          const alert = rowAlert11(e);
          const weekend = isWeekend(e.dia);
          const label = dayLabel(e.dia);
          const isToday = e.dia === todayDay;
          const cardBg = locked ? 'bg-gray-50 border-gray-200' : alert ? 'bg-red-50 border-red-300' : weekend ? 'bg-slate-100 border-slate-200' : 'bg-white border-teal-100';
          return (
            <div key={e.dia} ref={isToday ? todayRef : undefined} className={`rounded-xl border ${cardBg} overflow-hidden`}>
              <div className={`flex items-center justify-between px-4 py-2 ${locked ? 'bg-gray-100' : alert ? 'bg-red-100' : weekend ? 'bg-slate-200' : 'bg-teal-50'}`}>
                <span className={`font-bold text-base ${weekend ? 'text-slate-500' : 'text-teal-900'}`}>
                  Día {e.dia}{label && <span className="ml-1.5 text-xs font-semibold uppercase tracking-wide opacity-70">{label}</span>}
                </span>
                <div className="flex items-center gap-2">
                  {alert && !locked && <span className="text-xs text-red-600 font-semibold">⚠ Fuera de rango</span>}
                  {locked && <span className="text-xs text-gray-500">Confirmado</span>}
                  <button onClick={() => toggleLock(e.dia)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${locked ? 'bg-gray-200 text-gray-600 active:bg-gray-300' : 'bg-orange-500 text-white active:bg-orange-600'}`}>
                    {locked ? '🔒 Editar' : '✓ Confirmar'}
                  </button>
                </div>
              </div>

              <div className="px-4 py-3 space-y-3">
                <div>
                  <p className="text-xs font-bold text-orange-700 uppercase tracking-wide mb-1.5">Temperatura Refrigeración (°C) — 2–8°C</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[['Mañana', 'tempManana', isOutOfRangeTemp11(e.tempManana)], ['Tarde', 'tempTarde', isOutOfRangeTemp11(e.tempTarde)], ['Prom', null, isOutOfRangeTemp11(tProm)]].map(([label, field, oor]) => (
                      <div key={label as string} className={`rounded-lg p-2 text-center ${oor ? 'bg-red-100' : 'bg-gray-50'}`}>
                        <p className="text-xs text-gray-500 mb-1">{label as string}</p>
                        {field && !locked ? (
                          <input type="number" step="0.1" value={e[field as keyof RefrigDailyEntry]}
                            onChange={ev => update(i, field as keyof RefrigDailyEntry, ev.target.value)}
                            className={`w-full text-center text-base font-semibold bg-transparent focus:outline-none ${oor ? 'text-red-700' : 'text-gray-800'}`}
                            inputMode="decimal" />
                        ) : (
                          <p className={`text-base font-semibold ${oor ? 'text-red-700' : 'text-gray-800'}`}>{field ? e[field as keyof RefrigDailyEntry] : tProm}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Nombre / Firma responsable</p>
                    {locked ? <p className="text-sm text-gray-700 px-2 py-1.5 bg-gray-50 rounded-lg">{e.nombre || '—'}</p>
                      : <input value={e.nombre} onChange={ev => update(i, 'nombre', ev.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                          placeholder="Nombre del responsable" />}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Observaciones</p>
                    {locked ? <p className="text-sm text-gray-700 px-2 py-1.5 bg-gray-50 rounded-lg">{e.observaciones || '—'}</p>
                      : <input value={e.observaciones} onChange={ev => update(i, 'observaciones', ev.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                          placeholder="Observaciones" />}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        <div className="rounded-xl bg-orange-500 text-white p-4">
          <p className="text-xs font-bold uppercase tracking-wide mb-2">Promedio del mes</p>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div><p className="text-orange-100 text-xs">T. Mañana</p><p className="font-bold">{avgTempM}</p></div>
            <div><p className="text-orange-100 text-xs">T. Tarde</p><p className="font-bold">{avgTempT}</p></div>
            <div><p className="text-orange-100 text-xs">T. Prom</p><p className="font-bold">{avgTempP}</p></div>
          </div>
        </div>
      </div>

      {/* ── DESKTOP table ── */}
      <div className="desktop-table hidden md:block overflow-x-auto">
        <table className="w-full border-collapse text-sm min-w-[750px]">
          <thead>
            <tr>
              <th className={thCls} rowSpan={2}>DÍA</th>
              <th className={thCls} colSpan={3}>TEMPERATURA DE REFRIGERACIÓN (°C) — RANGO 2–8°C</th>
              <th className={thCls} rowSpan={2}>NOMBRE / FIRMA<br/>RESPONSABLE</th>
              <th className={thCls} rowSpan={2}>OBSERVACIONES</th>
              <th className={`${thCls} no-print`} rowSpan={2}>✓</th>
            </tr>
            <tr>
              {['MAÑANA','TARDE','PROM'].map((h,i) => <th key={i} className={thCls}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => {
              const tProm = calcProm(e.tempManana, e.tempTarde);
              const alert = rowAlert11(e);
              const locked = lockedDays.has(e.dia);
              const weekend = isWeekend(e.dia);
              const exceptional = isExceptional(e.dia);
              const label = dayLabel(e.dia);
              const effectiveLocked = locked || !!validated;
              const rowBg = effectiveLocked ? 'bg-gray-50' : alert ? 'bg-red-50' : (weekend || exceptional) ? 'bg-slate-100' : i % 2 === 0 ? 'bg-white' : 'bg-teal-50/20';
              return (
                <tr key={e.dia} className={rowBg}>
                  <td className={`${tdCls} text-center font-medium w-10 ${(weekend || exceptional) ? 'text-slate-400' : 'text-teal-800'}`}>
                    <div className="flex flex-col items-center leading-tight">
                      <span>{e.dia}</span>
                      {label && <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">{label}</span>}
                      {exceptional && !label && <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">NL</span>}
                    </div>
                  </td>
                  {(['tempManana','tempTarde'] as const).map(f => (
                    <td key={f} className={`${tdCls} ${cellCls(isOutOfRangeTemp11(e[f]))} w-24`}>
                      {effectiveLocked ? <span className="block text-center text-sm px-1">{e[f]}</span>
                        : <input className={inputNum} type="number" step="0.1" value={e[f]} onChange={ev => update(i, f, ev.target.value)} />}
                    </td>
                  ))}
                  <td className={`${tdCls} ${cellCls(isOutOfRangeTemp11(tProm))} w-24 text-center text-gray-700`}>{tProm}</td>
                  <td className={tdCls}>
                    {effectiveLocked ? <span className="block text-sm px-1">{e.nombre}</span>
                      : <input className={inputTxt} value={e.nombre} onChange={ev => update(i, 'nombre', ev.target.value)} />}
                  </td>
                  <td className={tdCls}>
                    {effectiveLocked ? <span className="block text-sm px-1">{e.observaciones}</span>
                      : <input className={inputTxt} value={e.observaciones} onChange={ev => update(i, 'observaciones', ev.target.value)} />}
                  </td>
                  <td className={`${tdCls} text-center no-print w-10`}>
                    {!validated && (
                      <button onClick={() => toggleLock(e.dia)} title={locked ? 'Clic para editar' : 'Confirmar día'}
                        className={`text-base transition-opacity hover:opacity-70 ${locked ? 'text-gray-500' : 'text-orange-500'}`}>
                        {locked ? '🔒' : '✓'}
                      </button>
                    )}
                    {validated && <span className="text-gray-400 text-base">🔒</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-orange-100 font-semibold">
              <td className={`${tdCls} text-center text-xs font-bold text-orange-900`}>PROM.<br/>MES</td>
              <td className={`${tdCls} text-center ${cellCls(isOutOfRangeTemp11(avgTempM))}`}>{avgTempM}</td>
              <td className={`${tdCls} text-center ${cellCls(isOutOfRangeTemp11(avgTempT))}`}>{avgTempT}</td>
              <td className={`${tdCls} text-center ${cellCls(isOutOfRangeTemp11(avgTempP))}`}>{avgTempP}</td>
              <td className={tdCls}/><td className={tdCls}/><td className={`${tdCls} no-print`}/>
            </tr>
          </tfoot>
        </table>
      </div>

      <FooterFields footer={footer} onFooterChange={onFooterChange} readOnly={validated} />
    </div>
  );
}
