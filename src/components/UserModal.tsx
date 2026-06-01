import { useState } from 'react';
import { Usuario, UserRole } from '../types';

interface Props {
  initial: Usuario | null;
  onSave: (u: Usuario) => void;
  onCancel: () => void;
}

export default function UserModal({ initial, onSave, onCancel }: Props) {
  const [nombre, setNombre] = useState(initial?.nombre ?? '');
  const [usuario, setUsuario] = useState(initial?.usuario ?? '');
  const [password, setPassword] = useState(initial?.password ?? '');
  const [rol, setRol] = useState<UserRole>(initial?.rol ?? 'operador');
  const [error, setError] = useState('');

  const handleSave = () => {
    if (!nombre.trim() || !usuario.trim() || !password.trim()) {
      setError('Todos los campos son obligatorios.');
      return;
    }
    const saved: Usuario = {
      id: initial?.id ?? Date.now().toString(),
      nombre: nombre.trim(),
      usuario: usuario.trim(),
      password: password.trim(),
      rol,
      creadoEn: initial?.creadoEn ?? new Date().toISOString(),
    };
    onSave(saved);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-blue-900 text-base">
            {initial ? 'Editar usuario' : 'Nuevo usuario'}
          </h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre completo</label>
            <input
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Ej: Juan Pérez"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Usuario (para login)</label>
            <input
              value={usuario}
              onChange={e => setUsuario(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Ej: jperez"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Contraseña</label>
            <input
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">Rol</label>
            <div className="flex gap-3">
              {(['admin', 'operador'] as UserRole[]).map(r => (
                <label key={r} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="rol"
                    value={r}
                    checked={rol === r}
                    onChange={() => setRol(r)}
                    className="accent-blue-700"
                  />
                  <span className="text-sm">
                    {r === 'admin' ? '👑 Administrador' : '👤 Operador'}
                  </span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {rol === 'admin'
                ? 'Acceso total: equipos, usuarios y registros.'
                : 'Puede ingresar y ver registros de temperatura.'}
            </p>
          </div>
          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">Cancelar</button>
          <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold transition-colors">Guardar</button>
        </div>
      </div>
    </div>
  );
}
