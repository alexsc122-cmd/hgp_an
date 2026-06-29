import { Termohigrometro } from '../types';

interface Props {
  termo: Termohigrometro;
  onView: (t: Termohigrometro) => void;
  onEdit?: (t: Termohigrometro) => void;
  onDelete?: (id: string) => void;
  onCalibration?: (t: Termohigrometro) => void;
  onLimpieza?: (t: Termohigrometro) => void;
  todayAlert?: { manana: boolean; tarde: boolean; locked: boolean };
  listMode?: boolean;
}

export default function TermoCard({ termo, onView, onEdit, onDelete, onCalibration, onLimpieza, todayAlert, listMode }: Props) {
  const isAmbiental = termo.tipo === 'ambiental';

  const handleDelete = () => {
    if (onDelete && window.confirm(`¿Eliminar "${termo.nombre}"? Esta acción no se puede deshacer.`)) {
      onDelete(termo.id);
    }
  };

  const alerts: { msg: string; color: string }[] = [];
  if (todayAlert) {
    if (!todayAlert.manana && !todayAlert.tarde) {
      alerts.push({ msg: 'Sin registro hoy', color: 'bg-red-50 border-red-200 text-red-700' });
    } else {
      if (!todayAlert.manana) alerts.push({ msg: 'Falta mañana', color: 'bg-amber-50 border-amber-200 text-amber-700' });
      if (!todayAlert.tarde) alerts.push({ msg: 'Falta tarde', color: 'bg-amber-50 border-amber-200 text-amber-700' });
    }
    if (!todayAlert.locked) alerts.push({ msg: 'Falta confirmar día', color: 'bg-blue-50 border-blue-200 text-blue-700' });
  }

  const typeBadge = (
    <span className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
      isAmbiental ? 'bg-teal-100 text-teal-800' : 'bg-orange-100 text-orange-700'
    }`}>
      {isAmbiental ? 'Ambiente' : 'Refrigeración'}
    </span>
  );

  const actionButtons = (
    <>
      <button
        onClick={() => onView(termo)}
        className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
          listMode ? 'px-4 whitespace-nowrap' : 'flex-1'
        } ${isAmbiental ? 'bg-teal-700 hover:bg-teal-800 text-white' : 'bg-orange-500 hover:bg-orange-600 text-white'}`}
      >
        Ver registros →
      </button>
      {onCalibration && (
        <button onClick={() => onCalibration(termo)} title="Historial de calibraciones"
          className="p-2 rounded-lg border border-blue-100 hover:bg-blue-50 text-blue-400 hover:text-blue-600 transition-colors text-base">
          🔧
        </button>
      )}
      {onLimpieza && (
        <button onClick={() => onLimpieza(termo)} title="Historial de limpiezas"
          className="p-2 rounded-lg border border-cyan-100 hover:bg-cyan-50 text-cyan-500 hover:text-cyan-700 transition-colors text-base">
          🧹
        </button>
      )}
      {onEdit && (
        <button onClick={() => onEdit(termo)} title="Editar equipo"
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors text-base">
          ✏️
        </button>
      )}
      {onDelete && (
        <button onClick={handleDelete} title="Eliminar equipo"
          className="p-2 rounded-lg border border-red-100 hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors text-base">
          🗑️
        </button>
      )}
    </>
  );

  // ── List row layout ──────────────────────────────────────────────────────────
  if (listMode) {
    return (
      <div className="bg-white border border-teal-100 rounded-xl shadow-sm hover:shadow-md transition-shadow px-4 py-3 flex items-center gap-3">
        {/* Name + number */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-teal-900 text-sm leading-tight">{termo.nombre}</span>
            {termo.numero && <span className="text-xs text-gray-400">N° {termo.numero}</span>}
          </div>
          {termo.ubicacion && (
            <span className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
              <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {termo.ubicacion}
            </span>
          )}
        </div>

        {/* Type badge */}
        <div className="hidden sm:block shrink-0">{typeBadge}</div>

        {/* Alert badges */}
        {alerts.length > 0 && (
          <div className="hidden sm:flex flex-col gap-1 shrink-0">
            {alerts.map(a => (
              <div key={a.msg} className={`flex items-center gap-1 border rounded-lg px-2.5 py-1 text-xs font-semibold ${a.color}`}>
                <span>⚠️</span><span>{a.msg}</span>
              </div>
            ))}
          </div>
        )}
        {alerts.length > 0 && (
          <div className="sm:hidden w-2 h-2 rounded-full bg-amber-400 shrink-0" title={alerts.map(a => a.msg).join(', ')} />
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {actionButtons}
        </div>
      </div>
    );
  }

  // ── Grid card layout ─────────────────────────────────────────────────────────
  return (
    <div className="bg-white border border-teal-100 rounded-xl shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-bold text-teal-900 text-base leading-tight">{termo.nombre}</h3>
          {termo.numero && <p className="text-xs text-gray-500 mt-0.5">N° {termo.numero}</p>}
        </div>
        {typeBadge}
      </div>

      {termo.ubicacion && (
        <p className="text-sm text-gray-600 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {termo.ubicacion}
        </p>
      )}

      {alerts.map(a => (
        <div key={a.msg} className={`flex items-center gap-1.5 border rounded-lg px-3 py-2 text-xs font-semibold ${a.color}`}>
          <span className="text-base leading-none">⚠️</span>
          <span>{a.msg}</span>
          <span className="ml-auto font-normal opacity-70">Hoy</span>
        </div>
      ))}

      <div className="flex items-center gap-2 mt-1">
        {actionButtons}
      </div>
    </div>
  );
}
