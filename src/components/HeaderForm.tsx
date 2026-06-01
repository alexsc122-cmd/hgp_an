import React from 'react';
import { HeaderInfo, MESES } from '../types';

interface Props {
  data: HeaderInfo;
  onChange: (data: HeaderInfo) => void;
  equipoLabel?: string;
  anexoTitle: string;
  anexoSubtitle: string;
}

export default function HeaderForm({ data, onChange, equipoLabel = 'No. Termohigrómetro', anexoTitle, anexoSubtitle }: Props) {
  const field = (label: string, key: keyof HeaderInfo, extra?: React.InputHTMLAttributes<HTMLInputElement>) => (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-blue-800 uppercase tracking-wide">{label}</label>
      <input
        className="border border-blue-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        value={data[key]}
        onChange={e => onChange({ ...data, [key]: e.target.value })}
        {...extra}
      />
    </div>
  );

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear - 2 + i);

  return (
    <div className="bg-white border border-blue-300 rounded-lg p-4 mb-4">
      {/* Title */}
      <div className="text-center mb-4">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-widest">Red Pública Integral de Salud — Ecuador</p>
        <h2 className="text-lg font-bold text-blue-900">{anexoTitle}</h2>
        <p className="text-sm text-blue-700">{anexoSubtitle}</p>
      </div>

      {/* Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        {field('Institución', 'institucion')}
        {field('Estrategia / Programa / Proyecto', 'estrategia')}
        {field('Establecimiento', 'establecimiento')}
        {field('Dirección', 'direccion')}
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {field(equipoLabel, 'noEquipo')}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-blue-800 uppercase tracking-wide">Año</label>
          <select
            className="border border-blue-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={data.anio}
            onChange={e => onChange({ ...data, anio: e.target.value })}
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-blue-800 uppercase tracking-wide">Mes</label>
          <select
            className="border border-blue-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={data.mes}
            onChange={e => onChange({ ...data, mes: e.target.value })}
          >
            {MESES.map((m, i) => (
              <option key={i} value={String(i + 1).padStart(2, '0')}>{m}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
