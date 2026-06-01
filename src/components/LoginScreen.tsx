import { useState } from 'react';
import { Usuario } from '../types';
import { setSession } from '../utils/storage';
import { fsGetUsuarioByLogin, fsLoadUsuarios, fsSaveUsuario } from '../utils/firestore';

interface Props {
  onLogin: (user: Usuario) => void;
}

export default function LoginScreen({ onLogin }: Props) {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      // Auto-create admin if no users exist
      const allUsers = await fsLoadUsuarios();
      if (allUsers.length === 0) {
        const admin: import('../types').Usuario = {
          id: '1', nombre: 'Administrador', usuario: 'admin',
          password: 'admin123', rol: 'admin', termosAsignados: [],
          creadoEn: new Date().toISOString(),
        };
        await fsSaveUsuario(admin);
      }
      const found = await fsGetUsuarioByLogin(usuario.trim());
      if (found && found.password === password) {
        setSession(found);
        onLogin(found);
      } else {
        setError('Usuario o contraseña incorrectos.');
      }
    } catch {
      setError('Error de conexión. Verifica tu internet.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-blue-800 px-8 py-6 text-center">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3 text-3xl">🌡️</div>
          <h1 className="text-white font-bold text-lg leading-tight">RPIS</h1>
          <p className="text-blue-200 text-xs mt-1">Control de Temperatura y Humedad</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Usuario</label>
            <input
              type="text"
              value={usuario}
              onChange={e => { setUsuario(e.target.value); setError(''); }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Ingresa tu usuario"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="••••••••"
            />
          </div>
          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
          <button
            type="submit"
            className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
          >
            Ingresar
          </button>
          <p className="text-center text-xs text-gray-400">
            Usuario por defecto: <span className="font-mono font-semibold">admin</span> / <span className="font-mono font-semibold">admin123</span>
          </p>
        </form>
      </div>
    </div>
  );
}
