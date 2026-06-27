import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { DailyEntry, RefrigDailyEntry, MESES } from '../types';
import { calcProm } from '../utils/calculations';

// ─── Anexo 10 chart ───────────────────────────────────────────────────────────

interface Anexo10ChartProps {
  entries: DailyEntry[];
  year: number;
  month: number;
}

export function Anexo10Chart({ entries, year, month }: Anexo10ChartProps) {
  const mesNombre = MESES[month - 1];

  const tempData = entries
    .filter(e => e.tempManana !== '' || e.tempTarde !== '')
    .map(e => ({
      dia: e.dia,
      'Mañana': e.tempManana !== '' ? parseFloat(e.tempManana) : undefined,
      'Tarde': e.tempTarde !== '' ? parseFloat(e.tempTarde) : undefined,
      'Promedio':
        e.tempManana !== '' && e.tempTarde !== ''
          ? parseFloat(calcProm(e.tempManana, e.tempTarde))
          : undefined,
    }));

  const humData = entries
    .filter(e => e.humManana !== '' || e.humTarde !== '')
    .map(e => ({
      dia: e.dia,
      'Mañana': e.humManana !== '' ? parseFloat(e.humManana) : undefined,
      'Tarde': e.humTarde !== '' ? parseFloat(e.humTarde) : undefined,
      'Promedio':
        e.humManana !== '' && e.humTarde !== ''
          ? parseFloat(calcProm(e.humManana, e.humTarde))
          : undefined,
    }));

  if (tempData.length === 0 && humData.length === 0) return null;

  return (
    <div className="mt-6 space-y-6 print-charts">
      {tempData.length > 0 && (
        <div className="bg-white border border-blue-100 rounded-lg p-4 shadow-sm">
          <h3 className="text-sm font-bold text-blue-900 mb-3">
            Curva de Temperatura — {mesNombre} {year}
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={tempData} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
              <XAxis
                dataKey="dia"
                tick={{ fontSize: 11 }}
                label={{ value: 'Día', position: 'insideBottomRight', offset: -4, fontSize: 11 }}
              />
              <YAxis
                unit="°C"
                tick={{ fontSize: 11 }}
                domain={['auto', 'auto']}
              />
              <Tooltip formatter={(v: unknown) => `${v} °C`} labelFormatter={(d: unknown) => `Día ${d}`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <ReferenceLine y={30} stroke="#ef4444" strokeDasharray="5 3" label={{ value: 'Límite 30°C', fill: '#ef4444', fontSize: 10 }} />
              <Line
                type="monotone"
                dataKey="Mañana"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="Tarde"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="Promedio"
                stroke="#10b981"
                strokeWidth={2}
                strokeDasharray="4 2"
                dot={{ r: 3 }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {humData.length > 0 && (
        <div className="bg-white border border-blue-100 rounded-lg p-4 shadow-sm">
          <h3 className="text-sm font-bold text-blue-900 mb-3">
            Curva de Humedad Relativa — {mesNombre} {year}
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={humData} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
              <XAxis
                dataKey="dia"
                tick={{ fontSize: 11 }}
                label={{ value: 'Día', position: 'insideBottomRight', offset: -4, fontSize: 11 }}
              />
              <YAxis
                unit="%"
                tick={{ fontSize: 11 }}
                domain={['auto', 'auto']}
              />
              <Tooltip formatter={(v: unknown) => `${v} %`} labelFormatter={(d: unknown) => `Día ${d}`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="5 3" label={{ value: 'Límite 70%', fill: '#ef4444', fontSize: 10 }} />
              <Line
                type="monotone"
                dataKey="Mañana"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="Tarde"
                stroke="#ec4899"
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="Promedio"
                stroke="#14b8a6"
                strokeWidth={2}
                strokeDasharray="4 2"
                dot={{ r: 3 }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ─── Anexo 11 chart ───────────────────────────────────────────────────────────

interface Anexo11ChartProps {
  entries: RefrigDailyEntry[];
  year: number;
  month: number;
}

export function Anexo11Chart({ entries, year, month }: Anexo11ChartProps) {
  const mesNombre = MESES[month - 1];

  const data = entries
    .filter(e => e.tempManana !== '' || e.tempTarde !== '')
    .map(e => ({
      dia: e.dia,
      'Mañana': e.tempManana !== '' ? parseFloat(e.tempManana) : undefined,
      'Tarde': e.tempTarde !== '' ? parseFloat(e.tempTarde) : undefined,
      'Promedio':
        e.tempManana !== '' && e.tempTarde !== ''
          ? parseFloat(calcProm(e.tempManana, e.tempTarde))
          : undefined,
    }));

  if (data.length === 0) return null;

  return (
    <div className="mt-6 print-charts">
      <div className="bg-white border border-blue-100 rounded-lg p-4 shadow-sm">
        <h3 className="text-sm font-bold text-blue-900 mb-3">
          Curva de Temperatura — {mesNombre} {year}
        </h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
            <XAxis
              dataKey="dia"
              tick={{ fontSize: 11 }}
              label={{ value: 'Día', position: 'insideBottomRight', offset: -4, fontSize: 11 }}
            />
            <YAxis
              unit="°C"
              tick={{ fontSize: 11 }}
              domain={['auto', 'auto']}
            />
            <Tooltip formatter={(v: unknown) => `${v} °C`} labelFormatter={(d: unknown) => `Día ${d}`} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <ReferenceLine y={8} stroke="#ef4444" strokeDasharray="5 3" label={{ value: 'Límite 8°C', fill: '#ef4444', fontSize: 10 }} />
            <ReferenceLine y={2} stroke="#ef4444" strokeDasharray="5 3" label={{ value: 'Mín 2°C', fill: '#ef4444', fontSize: 10 }} />
            <Line
              type="monotone"
              dataKey="Mañana"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="Tarde"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="Promedio"
              stroke="#10b981"
              strokeWidth={2}
              strokeDasharray="4 2"
              dot={{ r: 3 }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
