import { DailyEntry, RefrigDailyEntry } from '../types';
import {
  calcProm,
  monthlyAverage,
  isOutOfRangeTemp10,
  isOutOfRangeHum10,
  isOutOfRangeTemp11,
} from '../utils/calculations';

// ─── Anexo 10 Table ────────────────────────────────────────────────────────────

interface Anexo10TableProps {
  entries: DailyEntry[];
  onChange: (entries: DailyEntry[]) => void;
  footer: { revisadoPor: string; cargo: string; fecha: string };
  onFooterChange: (f: { revisadoPor: string; cargo: string; fecha: string }) => void;
  lockedDays: Set<number>;
  onLockedDaysChange: (locked: Set<number>) => void;
}

function cellCls(outOfRange: boolean) {
  return outOfRange ? 'bg-red-100 text-red-700 font-semibold' : '';
}

function rowAlert(e: DailyEntry): boolean {
  const tM = isOutOfRangeTemp10(e.tempManana);
  const tT = isOutOfRangeTemp10(e.tempTarde);
  const hM = isOutOfRangeHum10(e.humManana);
  const hT = isOutOfRangeHum10(e.humTarde);
  const tP = isOutOfRangeTemp10(calcProm(e.tempManana, e.tempTarde));
  const hP = isOutOfRangeHum10(calcProm(e.humManana, e.humTarde));
  return tM || tT || hM || hT || tP || hP;
}

export function Anexo10Table({ entries, onChange, footer, onFooterChange, lockedDays, onLockedDaysChange }: Anexo10TableProps) {
  const update = (i: number, field: keyof DailyEntry, val: string) => {
    const next = entries.map((e, idx) => idx === i ? { ...e, [field]: val } : e);
    onChange(next);
  };

  const toggleLock = (dia: number) => {
    const isLocked = lockedDays.has(dia);
    if (isLocked) {
      if (!window.confirm('¿Deseas editar este día?')) return;
      const next = new Set(lockedDays);
      next.delete(dia);
      onLockedDaysChange(next);
    } else {
      const next = new Set(lockedDays);
      next.add(dia);
      onLockedDaysChange(next);
    }
  };

  const inputCls = 'w-full bg-transparent text-center text-sm focus:outline-none focus:bg-blue-50 rounded px-1 py-0.5';
  const textInputCls = 'w-full bg-transparent text-sm focus:outline-none focus:bg-blue-50 rounded px-1 py-0.5';

  // Monthly averages
  const avgTempM = monthlyAverage(entries.map(e => e.tempManana));
  const avgTempT = monthlyAverage(entries.map(e => e.tempTarde));
  const avgTempP = monthlyAverage(entries.map(e => calcProm(e.tempManana, e.tempTarde)));
  const avgHumM = monthlyAverage(entries.map(e => e.humManana));
  const avgHumT = monthlyAverage(entries.map(e => e.humTarde));
  const avgHumP = monthlyAverage(entries.map(e => calcProm(e.humManana, e.humTarde)));

  const thCls = 'px-2 py-2 text-xs font-bold text-blue-900 bg-blue-50 border border-blue-200 text-center whitespace-nowrap';
  const tdCls = 'border border-blue-100 px-1 py-0.5';

  return (
    <div className="overflow-x-auto">
      {/* Alert legend */}
      <div className="flex items-center gap-4 mb-2 text-xs text-gray-600 no-print">
        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-200 inline-block"></span> Fuera de rango</span>
        <span>Temp MÁX: <strong>30°C</strong> · Humedad MÁX: <strong>70%</strong></span>
        <span className="inline-flex items-center gap-1 ml-4"><span className="w-3 h-3 rounded bg-gray-100 border border-gray-300 inline-block"></span> Día confirmado</span>
      </div>

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
            <th className={thCls}>MAÑANA</th>
            <th className={thCls}>TARDE</th>
            <th className={thCls}>PROM</th>
            <th className={thCls}>MAÑANA</th>
            <th className={thCls}>TARDE</th>
            <th className={thCls}>PROM</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => {
            const tProm = calcProm(e.tempManana, e.tempTarde);
            const hProm = calcProm(e.humManana, e.humTarde);
            const alert = rowAlert(e);
            const locked = lockedDays.has(e.dia);
            const rowBg = locked
              ? 'bg-gray-50'
              : alert
              ? 'bg-red-50'
              : i % 2 === 0
              ? 'bg-white'
              : 'bg-blue-50/30';
            return (
              <tr key={e.dia} className={rowBg}>
                <td className={`${tdCls} text-center font-medium text-blue-800 w-10`}>{e.dia}</td>
                <td className={`${tdCls} ${cellCls(isOutOfRangeTemp10(e.tempManana))} w-20`}>
                  {locked ? (
                    <span className="block text-center text-sm px-1">{e.tempManana}</span>
                  ) : (
                    <input className={inputCls} type="number" step="0.1" value={e.tempManana}
                      onChange={ev => update(i, 'tempManana', ev.target.value)} />
                  )}
                </td>
                <td className={`${tdCls} ${cellCls(isOutOfRangeTemp10(e.tempTarde))} w-20`}>
                  {locked ? (
                    <span className="block text-center text-sm px-1">{e.tempTarde}</span>
                  ) : (
                    <input className={inputCls} type="number" step="0.1" value={e.tempTarde}
                      onChange={ev => update(i, 'tempTarde', ev.target.value)} />
                  )}
                </td>
                <td className={`${tdCls} ${cellCls(isOutOfRangeTemp10(tProm))} w-20 text-center text-gray-700`}>
                  {tProm}
                </td>
                <td className={`${tdCls} ${cellCls(isOutOfRangeHum10(e.humManana))} w-20`}>
                  {locked ? (
                    <span className="block text-center text-sm px-1">{e.humManana}</span>
                  ) : (
                    <input className={inputCls} type="number" step="0.1" value={e.humManana}
                      onChange={ev => update(i, 'humManana', ev.target.value)} />
                  )}
                </td>
                <td className={`${tdCls} ${cellCls(isOutOfRangeHum10(e.humTarde))} w-20`}>
                  {locked ? (
                    <span className="block text-center text-sm px-1">{e.humTarde}</span>
                  ) : (
                    <input className={inputCls} type="number" step="0.1" value={e.humTarde}
                      onChange={ev => update(i, 'humTarde', ev.target.value)} />
                  )}
                </td>
                <td className={`${tdCls} ${cellCls(isOutOfRangeHum10(hProm))} w-20 text-center text-gray-700`}>
                  {hProm}
                </td>
                <td className={`${tdCls}`}>
                  {locked ? (
                    <span className="block text-sm px-1">{e.nombre}</span>
                  ) : (
                    <input className={textInputCls} value={e.nombre}
                      onChange={ev => update(i, 'nombre', ev.target.value)} />
                  )}
                </td>
                <td className={`${tdCls}`}>
                  {locked ? (
                    <span className="block text-sm px-1">{e.observaciones}</span>
                  ) : (
                    <input className={textInputCls} value={e.observaciones}
                      onChange={ev => update(i, 'observaciones', ev.target.value)} />
                  )}
                </td>
                <td className={`${tdCls} text-center no-print w-10`}>
                  <button
                    onClick={() => toggleLock(e.dia)}
                    title={locked ? 'Clic para editar' : 'Confirmar día'}
                    className={`text-base transition-opacity hover:opacity-70 ${locked ? 'text-gray-500' : 'text-green-600'}`}
                  >
                    {locked ? '🔒' : '✓'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-blue-100 font-semibold">
            <td className={`${tdCls} text-center text-xs font-bold text-blue-900`}>PROM.<br/>MES</td>
            <td className={`${tdCls} text-center ${cellCls(isOutOfRangeTemp10(avgTempM))}`}>{avgTempM}</td>
            <td className={`${tdCls} text-center ${cellCls(isOutOfRangeTemp10(avgTempT))}`}>{avgTempT}</td>
            <td className={`${tdCls} text-center ${cellCls(isOutOfRangeTemp10(avgTempP))}`}>{avgTempP}</td>
            <td className={`${tdCls} text-center ${cellCls(isOutOfRangeHum10(avgHumM))}`}>{avgHumM}</td>
            <td className={`${tdCls} text-center ${cellCls(isOutOfRangeHum10(avgHumT))}`}>{avgHumT}</td>
            <td className={`${tdCls} text-center ${cellCls(isOutOfRangeHum10(avgHumP))}`}>{avgHumP}</td>
            <td className={tdCls}></td>
            <td className={tdCls}></td>
            <td className={`${tdCls} no-print`}></td>
          </tr>
        </tfoot>
      </table>

      {/* Footer fields */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        {(['revisadoPor', 'cargo', 'fecha'] as const).map(k => (
          <div key={k} className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-blue-800 uppercase tracking-wide">
              {k === 'revisadoPor' ? 'Revisado por' : k === 'cargo' ? 'Cargo' : 'Fecha'}
            </label>
            <input
              className="border border-blue-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={footer[k]}
              onChange={e => onFooterChange({ ...footer, [k]: e.target.value })}
              type={k === 'fecha' ? 'date' : 'text'}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Anexo 11 Table ────────────────────────────────────────────────────────────

interface Anexo11TableProps {
  entries: RefrigDailyEntry[];
  onChange: (entries: RefrigDailyEntry[]) => void;
  footer: { revisadoPor: string; cargo: string; fecha: string };
  onFooterChange: (f: { revisadoPor: string; cargo: string; fecha: string }) => void;
  lockedDays: Set<number>;
  onLockedDaysChange: (locked: Set<number>) => void;
}

function rowAlert11(e: RefrigDailyEntry): boolean {
  return (
    isOutOfRangeTemp11(e.tempManana) ||
    isOutOfRangeTemp11(e.tempTarde) ||
    isOutOfRangeTemp11(calcProm(e.tempManana, e.tempTarde))
  );
}

export function Anexo11Table({ entries, onChange, footer, onFooterChange, lockedDays, onLockedDaysChange }: Anexo11TableProps) {
  const update = (i: number, field: keyof RefrigDailyEntry, val: string) => {
    const next = entries.map((e, idx) => idx === i ? { ...e, [field]: val } : e);
    onChange(next);
  };

  const toggleLock = (dia: number) => {
    const isLocked = lockedDays.has(dia);
    if (isLocked) {
      if (!window.confirm('¿Deseas editar este día?')) return;
      const next = new Set(lockedDays);
      next.delete(dia);
      onLockedDaysChange(next);
    } else {
      const next = new Set(lockedDays);
      next.add(dia);
      onLockedDaysChange(next);
    }
  };

  const inputCls = 'w-full bg-transparent text-center text-sm focus:outline-none focus:bg-blue-50 rounded px-1 py-0.5';
  const textInputCls = 'w-full bg-transparent text-sm focus:outline-none focus:bg-blue-50 rounded px-1 py-0.5';

  const avgTempM = monthlyAverage(entries.map(e => e.tempManana));
  const avgTempT = monthlyAverage(entries.map(e => e.tempTarde));
  const avgTempP = monthlyAverage(entries.map(e => calcProm(e.tempManana, e.tempTarde)));

  const thCls = 'px-2 py-2 text-xs font-bold text-blue-900 bg-blue-50 border border-blue-200 text-center whitespace-nowrap';
  const tdCls = 'border border-blue-100 px-1 py-0.5';

  return (
    <div className="overflow-x-auto">
      <div className="flex items-center gap-4 mb-2 text-xs text-gray-600 no-print">
        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-200 inline-block"></span> Fuera de rango</span>
        <span>Rango temp: <strong>2–8°C</strong></span>
        <span className="inline-flex items-center gap-1 ml-4"><span className="w-3 h-3 rounded bg-gray-100 border border-gray-300 inline-block"></span> Día confirmado</span>
      </div>

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
            <th className={thCls}>MAÑANA</th>
            <th className={thCls}>TARDE</th>
            <th className={thCls}>PROM</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => {
            const tProm = calcProm(e.tempManana, e.tempTarde);
            const alert = rowAlert11(e);
            const locked = lockedDays.has(e.dia);
            const rowBg = locked
              ? 'bg-gray-50'
              : alert
              ? 'bg-red-50'
              : i % 2 === 0
              ? 'bg-white'
              : 'bg-blue-50/30';
            return (
              <tr key={e.dia} className={rowBg}>
                <td className={`${tdCls} text-center font-medium text-blue-800 w-10`}>{e.dia}</td>
                <td className={`${tdCls} ${cellCls(isOutOfRangeTemp11(e.tempManana))} w-24`}>
                  {locked ? (
                    <span className="block text-center text-sm px-1">{e.tempManana}</span>
                  ) : (
                    <input className={inputCls} type="number" step="0.1" value={e.tempManana}
                      onChange={ev => update(i, 'tempManana', ev.target.value)} />
                  )}
                </td>
                <td className={`${tdCls} ${cellCls(isOutOfRangeTemp11(e.tempTarde))} w-24`}>
                  {locked ? (
                    <span className="block text-center text-sm px-1">{e.tempTarde}</span>
                  ) : (
                    <input className={inputCls} type="number" step="0.1" value={e.tempTarde}
                      onChange={ev => update(i, 'tempTarde', ev.target.value)} />
                  )}
                </td>
                <td className={`${tdCls} ${cellCls(isOutOfRangeTemp11(tProm))} w-24 text-center text-gray-700`}>
                  {tProm}
                </td>
                <td className={`${tdCls}`}>
                  {locked ? (
                    <span className="block text-sm px-1">{e.nombre}</span>
                  ) : (
                    <input className={textInputCls} value={e.nombre}
                      onChange={ev => update(i, 'nombre', ev.target.value)} />
                  )}
                </td>
                <td className={`${tdCls}`}>
                  {locked ? (
                    <span className="block text-sm px-1">{e.observaciones}</span>
                  ) : (
                    <input className={textInputCls} value={e.observaciones}
                      onChange={ev => update(i, 'observaciones', ev.target.value)} />
                  )}
                </td>
                <td className={`${tdCls} text-center no-print w-10`}>
                  <button
                    onClick={() => toggleLock(e.dia)}
                    title={locked ? 'Clic para editar' : 'Confirmar día'}
                    className={`text-base transition-opacity hover:opacity-70 ${locked ? 'text-gray-500' : 'text-green-600'}`}
                  >
                    {locked ? '🔒' : '✓'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-blue-100 font-semibold">
            <td className={`${tdCls} text-center text-xs font-bold text-blue-900`}>PROM.<br/>MES</td>
            <td className={`${tdCls} text-center ${cellCls(isOutOfRangeTemp11(avgTempM))}`}>{avgTempM}</td>
            <td className={`${tdCls} text-center ${cellCls(isOutOfRangeTemp11(avgTempT))}`}>{avgTempT}</td>
            <td className={`${tdCls} text-center ${cellCls(isOutOfRangeTemp11(avgTempP))}`}>{avgTempP}</td>
            <td className={tdCls}></td>
            <td className={tdCls}></td>
            <td className={`${tdCls} no-print`}></td>
          </tr>
        </tfoot>
      </table>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        {(['revisadoPor', 'cargo', 'fecha'] as const).map(k => (
          <div key={k} className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-blue-800 uppercase tracking-wide">
              {k === 'revisadoPor' ? 'Revisado por' : k === 'cargo' ? 'Cargo' : 'Fecha'}
            </label>
            <input
              className="border border-blue-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={footer[k]}
              onChange={e => onFooterChange({ ...footer, [k]: e.target.value })}
              type={k === 'fecha' ? 'date' : 'text'}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
