import { Termohigrometro } from '../types';

interface Props {
  termo: Termohigrometro;
  onView: (t: Termohigrometro) => void;
  onEdit: (t: Termohigrometro) => void;
  onDelete: (id: string) => void;
}

export default function TermoCard({ termo, onView, onEdit, onDelete }: Props) {
  const isAmbiental = termo.tipo === 'ambiental';

  const handleDelete = () => {
    if (window.confirm(`¿Eliminar "${termo.nombre}"? Esta acción no se puede deshacer.`)) {
      onDelete(termo.id);
    }
  };

  return (
    <div className="bg-white border border-blue-100 rounded-xl shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-bold text-blue-900 text-base leading-tight">{termo.nombre}</h3>
          {termo.numero && (
            <p className="text-xs text-gray-500 mt-0.5">N° {termo.numero}</p>
          )}
        </div>
        <span
          className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
            isAmbiental
              ? 'bg-blue-100 text-blue-800'
              : 'bg-teal-100 text-teal-800'
          }`}
        >
          {isAmbiental ? 'Ambiente' : 'Refrigeración'}
        </span>
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

      <div className="flex items-center gap-2 mt-1">
        <button
          onClick={() => onView(termo)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
            isAmbiental
              ? 'bg-blue-700 hover:bg-blue-800 text-white'
              : 'bg-teal-700 hover:bg-teal-800 text-white'
          }`}
        >
          Ver registros →
        </button>
        <button
          onClick={() => onEdit(termo)}
          title="Editar equipo"
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors text-base"
        >
          ✏️
        </button>
        <button
          onClick={handleDelete}
          title="Eliminar equipo"
          className="p-2 rounded-lg border border-red-100 hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors text-base"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}
