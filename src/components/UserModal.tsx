import { useState } from 'react';
import { Usuario, UserRole, Termohigrometro } from '../types';

interface Props {
  initial: Usuario | null;
  termos: Termohigrometro[];
  onSave: (u: Usuario) => void;
  onCancel: () => void;
}

export default function UserModal({ initial, termos, onSave, onCancel }: Props) {
  const [nombre, setNombre] = useState(initial?.nombre ?? '');
  const [usuario, setUsuario] = useState(initial?.usuario ?? '');
  const [password, setPassword] = useState(initial?.password ?? '');
  const [rol, setRol] = useState<UserRole>(initial?.rol ?? 'operador');
  const validIds = new Set(termos.map(t => t.id));
  const [termosAsignados, setTermosAsignados] = useState<string[]>(
    (initial?.termosAsignados ?? []).filter(id => validIds.has(id))
  );
  const [error, setError] = useState('');

  // Group termos by ubicacion
  const grouped = termos.reduce<Record<string, Termohigrometro[]>>((acc, t) => {
    const key = t.ubicacion?.trim() || 'Sin ubicación';
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

  const toggleTermo = (id: string) => {
    setTermosAsignados(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleUbicacion = (termoIds: string[]) => {
    const allSelected = termoIds.every(id => termosAsignados.includes(id));
    if (allSelected) {
      setTermosAsignados(prev => prev.filter(id => !termoIds.includes(id)));
    } else {
      setTermosAsignados(prev => [...new Set([...prev, ...termoIds])]);
    }
  };

  const handleSave = () => {
    if (!nombre.trim() || !usuario.trim() || !password.trim()) {
      setError('Nombre, usuario y contraseña son obligatorios.');
      return;
    }
    if (rol === 'operador' && termosAsignados.length === 0) {
      setError('Debes asignar al menos un equipo al operador.');
      return;
    }
    const saved: Usuario = {
      id: initial?.id ?? Date.now().toString(),
      nombre: nombre.trim(),
      usuario: usuario.trim(),
      password: password.trim(),
      rol,
      termosAsignados: rol === 'admin' ? [] : termosAsignados,
      creadoEn: initial?.creadoEn ?? new Date().toISOString(),
    };
    onSave(saved);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h2 className="font-bold text-teal-900 text-base">
            {initial ? 'Editar usuario' : 'Nuevo usuario'}
          </h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre completo</label>
              <input
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                placeholder="Ej: Juan Pérez"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Usuario (login)</label>
              <input
                value={usuario}
                onChange={e => setUsuario(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                placeholder="Ej: jperez"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Contraseña</label>
            <input
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              placeholder="••••••••"
            />
          </div>

          {/* Rol */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">Rol</label>
            <div className="flex gap-3">
              {(['admin', 'operador'] as UserRole[]).map(r => (
                <label key={r} className={`flex items-center gap-2 cursor-pointer flex-1 border rounded-lg px-3 py-2 transition-colors ${rol === r ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <input
                    type="radio"
                    name="rol"
                    value={r}
                    checked={rol === r}
                    onChange={() => setRol(r)}
                    className="accent-blue-700"
                  />
                  <div>
                    <div className="text-sm font-semibold">{r === 'admin' ? '👑 Administrador' : '👤 Operador'}</div>
                    <div className="text-xs text-gray-400">{r === 'admin' ? 'Acceso total' : 'Solo sus equipos'}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Asignación de termohigrómetros — solo para operadores */}
          {rol === 'operador' && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">
                Equipos asignados
                <span className="ml-2 font-normal text-gray-400">— el operador solo verá estos equipos</span>
              </label>

              {termos.length === 0 ? (
                <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-3 text-center">
                  No hay equipos registrados aún. Agrega equipos primero.
                </p>
              ) : (
                <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
                  {Object.entries(grouped).map(([ubicacion, items]) => {
                    const ids = items.map(t => t.id);
                    const allChecked = ids.every(id => termosAsignados.includes(id));
                    const someChecked = ids.some(id => termosAsignados.includes(id));

                    return (
                      <div key={ubicacion}>
                        {/* Location header — click to select all in this location */}
                        <button
                          type="button"
                          onClick={() => toggleUbicacion(ids)}
                          className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                            allChecked ? 'bg-blue-700 border-blue-700' : someChecked ? 'bg-blue-200 border-blue-400' : 'border-gray-300'
                          }`}>
                            {allChecked && <span className="text-white text-xs leading-none">✓</span>}
                            {someChecked && !allChecked && <span className="text-blue-700 text-xs leading-none">–</span>}
                          </div>
                          <span className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                            📍 {ubicacion}
                          </span>
                          <span className="ml-auto text-xs text-gray-400">{items.length} equipo{items.length !== 1 ? 's' : ''}</span>
                        </button>

                        {/* Individual termos */}
                        {items.map(t => {
                          const checked = termosAsignados.includes(t.id);
                          const isAmbiental = t.tipo === 'ambiental';
                          return (
                            <label key={t.id} className="flex items-center gap-3 px-4 py-2 hover:bg-blue-50 cursor-pointer transition-colors">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleTermo(t.id)}
                                className="accent-blue-700"
                              />
                              <div className="flex-1 min-w-0">
                                <span className="text-sm text-gray-800 font-medium">{t.nombre}</span>
                                {t.numero && <span className="text-xs text-gray-400 ml-1">N° {t.numero}</span>}
                              </div>
                              <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-semibold ${isAmbiental ? 'bg-blue-100 text-blue-700' : 'bg-teal-100 text-teal-700'}`}>
                                {isAmbiental ? 'Ambiente' : 'Refrig.'}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}

              {termosAsignados.length > 0 && (
                <p className="text-xs text-blue-600 mt-1">{termosAsignados.length} equipo{termosAsignados.length !== 1 ? 's' : ''} asignado{termosAsignados.length !== 1 ? 's' : ''}</p>
              )}
            </div>
          )}

          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2 shrink-0">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">Cancelar</button>
          <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold transition-colors">Guardar</button>
        </div>
      </div>
    </div>
  );
}
