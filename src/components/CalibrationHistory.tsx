import { useState, useEffect } from 'react';
import { Calibracion, Termohigrometro } from '../types';
import { fsLoadCalibraciones, fsSavecalibracion, fsDeleteCalibracion } from '../utils/firestore';

interface Props {
  termo: Termohigrometro;
  isAdmin: boolean;
  onClose: () => void;
}

const emptyForm = (): Omit<Calibracion, 'id' | 'termoId' | 'creadoEn'> => ({
  fecha: new Date().toISOString().slice(0, 10),
  numeroCertificado: '',
  laboratorio: '',
  resultado: 'aprobado',
  observaciones: '',
});

export default function CalibrationHistory({ termo, isAdmin, onClose }: Props) {
  const [calibraciones, setCalibraciones] = useState<Calibracion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fsLoadCalibraciones(termo.id)
      .then(setCalibraciones)
      .catch(() => alert('Error al cargar calibraciones.'))
      .finally(() => setLoading(false));
  }, [termo.id]);

  const handleSave = async () => {
    if (!form.fecha || !form.numeroCertificado.trim() || !form.laboratorio.trim()) {
      alert('Fecha, número de certificado y laboratorio son obligatorios.');
      return;
    }
    setSaving(true);
    const nueva: Calibracion = {
      id: Date.now().toString(),
      termoId: termo.id,
      creadoEn: new Date().toISOString(),
      ...form,
      numeroCertificado: form.numeroCertificado.trim(),
      laboratorio: form.laboratorio.trim(),
      observaciones: form.observaciones.trim(),
    };
    try {
      await fsSavecalibracion(nueva);
      setCalibraciones(prev => [nueva, ...prev]);
      setShowForm(false);
      setForm(emptyForm());
    } catch { alert('Error al guardar calibración.'); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este registro de calibración?')) return;
    try {
      await fsDeleteCalibracion(id);
      setCalibraciones(prev => prev.filter(c => c.id !== id));
    } catch { alert('Error al eliminar calibración.'); }
  };

  const fmtFecha = (iso: string) => {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-bold text-teal-900 text-base">🔧 Historial de Calibraciones</h2>
            <p className="text-xs text-gray-500 mt-0.5">{termo.nombre}{termo.numero ? ` · N° ${termo.numero}` : ''}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Add button */}
          {isAdmin && !showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="w-full border-2 border-dashed border-teal-200 hover:border-teal-400 text-teal-600 hover:text-teal-800 rounded-xl py-3 text-sm font-semibold transition-colors"
            >
              + Registrar nueva calibración
            </button>
          )}

          {/* Form */}
          {showForm && (
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-bold text-teal-900">Nueva calibración</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha de calibración *</label>
                  <input
                    type="date"
                    value={form.fecha}
                    onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">N° Certificado *</label>
                  <input
                    value={form.numeroCertificado}
                    onChange={e => setForm(f => ({ ...f, numeroCertificado: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                    placeholder="Ej. CAL-2024-001"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Laboratorio *</label>
                  <input
                    value={form.laboratorio}
                    onChange={e => setForm(f => ({ ...f, laboratorio: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                    placeholder="Nombre del laboratorio"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Resultado</label>
                  <select
                    value={form.resultado}
                    onChange={e => setForm(f => ({ ...f, resultado: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                  >
                    <option value="aprobado">Aprobado</option>
                    <option value="con observaciones">Con observaciones</option>
                    <option value="rechazado">Rechazado</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Observaciones</label>
                <textarea
                  value={form.observaciones}
                  onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none"
                  placeholder="Notas adicionales..."
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setShowForm(false); setForm(emptyForm()); }}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white text-sm font-semibold"
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          )}

          {/* List */}
          {loading ? (
            <p className="text-center text-sm text-gray-400 py-8">Cargando...</p>
          ) : calibraciones.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">No hay calibraciones registradas para este equipo.</p>
          ) : (
            <div className="space-y-3">
              {calibraciones.map(c => {
                const resultColor = c.resultado === 'aprobado'
                  ? 'bg-green-100 text-green-700'
                  : c.resultado === 'con observaciones'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-red-100 text-red-700';
                return (
                  <div key={c.id} className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-teal-900 text-sm">{fmtFecha(c.fecha)}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${resultColor}`}>
                            {c.resultado}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600">
                          <span className="font-semibold">Certificado:</span> {c.numeroCertificado}
                        </p>
                        <p className="text-xs text-gray-600">
                          <span className="font-semibold">Laboratorio:</span> {c.laboratorio}
                        </p>
                        {c.observaciones && (
                          <p className="text-xs text-gray-500 italic">{c.observaciones}</p>
                        )}
                      </div>
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="text-red-400 hover:text-red-600 text-xs shrink-0"
                          title="Eliminar"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
