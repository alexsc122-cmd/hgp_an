import { useState, useEffect } from 'react';
import { Termohigrometro, Usuario } from '../types';
import { fsLoadUsuarios } from '../utils/firestore';

interface Props {
  initial?: Termohigrometro | null;
  ubicaciones: string[];
  onSave: (t: Termohigrometro) => void;
  onCancel: () => void;
}

export default function TermoModal({ initial, ubicaciones, onSave, onCancel }: Props) {
  const [nombre, setNombre] = useState('');
  const [numero, setNumero] = useState('');
  const [tipo, setTipo] = useState<'ambiental' | 'refrigeracion'>('ambiental');
  const [ubicacion, setUbicacion] = useState('');
  const [revisadoPor, setRevisadoPor] = useState('');
  const [cargo, setCargo] = useState('');
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);

  useEffect(() => {
    fsLoadUsuarios().then(setUsuarios).catch(() => {});
  }, []);

  useEffect(() => {
    if (initial) {
      setNombre(initial.nombre);
      setNumero(initial.numero);
      setTipo(initial.tipo);
      setUbicacion(initial.ubicacion);
      setRevisadoPor(initial.revisadoPor ?? '');
      setCargo(initial.cargo ?? '');
    } else {
      setNombre('');
      setNumero('');
      setTipo('ambiental');
      setUbicacion('');
      setRevisadoPor('');
      setCargo('');
    }
  }, [initial]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    const termo: Termohigrometro = {
      id: initial?.id ?? Date.now().toString(),
      nombre: nombre.trim(),
      numero: numero.trim(),
      tipo,
      ubicacion: ubicacion.trim(),
      creadoEn: initial?.creadoEn ?? new Date().toISOString(),
      revisadoPor: revisadoPor.trim(),
      cargo: cargo.trim(),
    };
    onSave(termo);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-teal-100 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-bold text-teal-900">
            {initial ? 'Editar equipo' : 'Agregar equipo'}
          </h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-teal-800 uppercase tracking-wide">Nombre del equipo *</label>
            <input
              required
              className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              placeholder="Ej. Termohigrómetro 1, Cuarto Frío Bodega"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-teal-800 uppercase tracking-wide">Número de equipo</label>
            <input
              className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              placeholder="Ej. TH-001"
              value={numero}
              onChange={e => setNumero(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-teal-800 uppercase tracking-wide">Tipo de registro</label>
            <label className="flex items-center gap-3 p-3 border border-teal-200 rounded-lg cursor-pointer hover:bg-blue-50 transition-colors">
              <input type="radio" name="tipo" value="ambiental" checked={tipo === 'ambiental'} onChange={() => setTipo('ambiental')} className="text-blue-600" />
              <div>
                <div className="text-sm font-semibold text-teal-900">Temperatura Ambiente</div>
                <div className="text-xs text-gray-500">Anexo 10 — Temperatura y Humedad Ambiental</div>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 border border-teal-200 rounded-lg cursor-pointer hover:bg-teal-50 transition-colors">
              <input type="radio" name="tipo" value="refrigeracion" checked={tipo === 'refrigeracion'} onChange={() => setTipo('refrigeracion')} className="text-teal-600" />
              <div>
                <div className="text-sm font-semibold text-teal-900">Temperatura de Refrigeración</div>
                <div className="text-xs text-gray-500">Anexo 11 — Temperatura de Refrigeración</div>
              </div>
            </label>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-teal-800 uppercase tracking-wide">Ubicación</label>
            {ubicaciones.length === 0 ? (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                No hay ubicaciones creadas. El administrador debe crearlas primero desde la pestaña Ubicaciones.
              </p>
            ) : (
              <select
                required
                className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                value={ubicacion}
                onChange={e => setUbicacion(e.target.value)}
              >
                <option value="">— Selecciona una ubicación —</option>
                {ubicaciones.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            )}
          </div>

          {/* Responsable de revisión */}
          <div className="border-t border-teal-100 pt-4">
            <p className="text-xs font-semibold text-teal-800 uppercase tracking-wide mb-3">Responsable del registro</p>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-600">Revisado por</label>
                {usuarios.length > 0 ? (
                  <select
                    className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                    value={revisadoPor}
                    onChange={e => setRevisadoPor(e.target.value)}
                  >
                    <option value="">— Selecciona un usuario —</option>
                    {usuarios.map(u => (
                      <option key={u.id} value={u.nombre}>
                        {u.nombre} ({u.rol === 'admin' ? 'Admin' : u.rol === 'validador' ? 'Validador' : 'Operador'})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                    placeholder="Nombre completo del responsable"
                    value={revisadoPor}
                    onChange={e => setRevisadoPor(e.target.value)}
                  />
                )}
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-600">Cargo</label>
                <input
                  className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                  placeholder="Ej. Químico Farmacéutico, Regente"
                  value={cargo}
                  onChange={e => setCargo(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">Se pre-llena automáticamente en el pie de cada registro mensual.</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" className="flex-1 bg-teal-700 hover:bg-teal-800 text-white font-semibold py-2 rounded-lg text-sm transition-colors shadow">
              Guardar
            </button>
            <button type="button" onClick={onCancel} className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-2 rounded-lg text-sm transition-colors">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
