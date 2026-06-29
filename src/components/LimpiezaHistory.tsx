import { useState, useEffect } from 'react';
import { Limpieza, Termohigrometro } from '../types';
import { fsLoadLimpiezas, fsSaveLimpieza, fsDeleteLimpieza } from '../utils/firestore';

interface Props {
  termo: Termohigrometro;
  isAdmin: boolean;
  onClose: () => void;
}

const TIPOS: { value: Limpieza['tipo']; label: string }[] = [
  { value: 'mensual', label: 'Limpieza Mensual Profunda' },
  { value: 'descongelacion', label: 'Descongelación Planificada' },
  { value: 'otro', label: 'Otro' },
];

const tipoBadge = (tipo: Limpieza['tipo']) => {
  if (tipo === 'mensual') return 'bg-blue-100 text-blue-800';
  if (tipo === 'descongelacion') return 'bg-cyan-100 text-cyan-800';
  return 'bg-gray-100 text-gray-700';
};

const tipoLabel = (tipo: Limpieza['tipo']) =>
  TIPOS.find(t => t.value === tipo)?.label ?? tipo;

const emptyForm = () => ({
  fecha: new Date().toISOString().slice(0, 10),
  tipo: 'mensual' as Limpieza['tipo'],
  responsable: '',
  observaciones: '',
});

const fmtFecha = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

export default function LimpiezaHistory({ termo, isAdmin, onClose }: Props) {
  const [limpiezas, setLimpiezas] = useState<Limpieza[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fsLoadLimpiezas(termo.id)
      .then(setLimpiezas)
      .catch(() => alert('Error al cargar limpiezas.'))
      .finally(() => setLoading(false));
  }, [termo.id]);

  const daysSince = (fecha: string) => {
    const diff = Date.now() - new Date(fecha).getTime();
    return Math.floor(diff / 86400000);
  };

  const vigencia = () => {
    if (limpiezas.length === 0) return { label: 'Sin registros', cls: 'bg-gray-100 text-gray-600' };
    const days = daysSince(limpiezas[0].fecha);
    if (days > 30) return { label: `⚠ Limpieza vencida (hace ${days} días)`, cls: 'bg-red-100 text-red-700' };
    if (days >= 20) return { label: `⚠ Próxima a vencer (hace ${days} días)`, cls: 'bg-amber-100 text-amber-700' };
    return { label: `✓ Al día (hace ${days} días)`, cls: 'bg-green-100 text-green-700' };
  };

  const handleSave = async () => {
    if (!form.fecha || !form.responsable.trim()) {
      alert('Fecha y responsable son obligatorios.');
      return;
    }
    setSaving(true);
    const nueva: Limpieza = {
      id: Date.now().toString(),
      termoId: termo.id,
      creadoEn: new Date().toISOString(),
      ...form,
      responsable: form.responsable.trim(),
      observaciones: form.observaciones.trim(),
    };
    try {
      await fsSaveLimpieza(nueva);
      setLimpiezas(prev => [nueva, ...prev].sort((a, b) => b.fecha.localeCompare(a.fecha)));
      setShowForm(false);
      setForm(emptyForm());
    } catch { alert('Error al guardar limpieza.'); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este registro de limpieza?')) return;
    try {
      await fsDeleteLimpieza(id);
      setLimpiezas(prev => prev.filter(l => l.id !== id));
    } catch { alert('Error al eliminar limpieza.'); }
  };

  const v = vigencia();

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-bold text-teal-900 text-base">🧹 Historial de Limpiezas</h2>
            <p className="text-xs text-gray-500 mt-0.5">{termo.nombre}{termo.numero ? ` · N° ${termo.numero}` : ''}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Vigencia */}
          <div className={`px-4 py-2 rounded-lg text-sm font-semibold ${v.cls}`}>{v.label}</div>

          {/* Add button */}
          {isAdmin && !showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="w-full border-2 border-dashed border-teal-200 hover:border-teal-400 text-teal-600 hover:text-teal-800 rounded-xl py-3 text-sm font-semibold transition-colors"
            >
              + Registrar nueva limpieza
            </button>
          )}

          {/* Form */}
          {showForm && (
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-bold text-teal-900">Nueva limpieza</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha *</label>
                  <input type="date" value={form.fecha}
                    onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Tipo</label>
                  <select value={form.tipo}
                    onChange={e => setForm(f => ({ ...f, tipo: e.target.value as Limpieza['tipo'] }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
                    {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Responsable *</label>
                  <input value={form.responsable}
                    onChange={e => setForm(f => ({ ...f, responsable: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                    placeholder="Nombre del responsable" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Observaciones</label>
                <textarea value={form.observaciones}
                  onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none"
                  placeholder="Notas adicionales..." />
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => { setShowForm(false); setForm(emptyForm()); }}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
                  Cancelar
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white text-sm font-semibold">
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          )}

          {/* List */}
          {loading ? (
            <p className="text-center text-sm text-gray-400 py-8">Cargando...</p>
          ) : limpiezas.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">No hay limpiezas registradas para este equipo.</p>
          ) : (
            <div className="space-y-3">
              {limpiezas.map(l => (
                <div key={l.id} className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-teal-900 text-sm">{fmtFecha(l.fecha)}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${tipoBadge(l.tipo)}`}>
                          {tipoLabel(l.tipo)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600"><span className="font-semibold">Responsable:</span> {l.responsable}</p>
                      {l.observaciones && <p className="text-xs text-gray-500 italic">{l.observaciones}</p>}
                    </div>
                    {isAdmin && (
                      <button onClick={() => handleDelete(l.id)}
                        className="text-red-400 hover:text-red-600 text-xs shrink-0" title="Eliminar">
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
