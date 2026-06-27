import { useState } from 'react';
import { Usuario } from '../types';
import { setSession } from '../utils/storage';
import {
  fsAuthLogin, fsAuthCreateUser,
  fsGetUsuarioByLogin, fsLoadUsuarios, fsSaveUsuario,
} from '../utils/firestore';

interface Props {
  onLogin: (user: Usuario) => void;
}

export default function LoginScreen({ onLogin }: Props) {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Auto-create admin if no users exist in Firestore
      const allUsers = await fsLoadUsuarios();
      if (allUsers.length === 0) {
        const admin: Usuario = {
          id: '1', nombre: 'Administrador', usuario: 'admin',
          email: 'admin@vivens.local', password: 'admin123',
          rol: 'admin', termosAsignados: [],
          creadoEn: new Date().toISOString(),
        };
        await fsSaveUsuario(admin);
        await fsAuthCreateUser('admin@vivens.local', 'admin123');
      }

      // Find user in Firestore first to validate credentials
      const found = await fsGetUsuarioByLogin(usuario.trim());
      if (!found) {
        setError('Usuario o contraseña incorrectos.');
        setLoading(false);
        return;
      }
      if (found.password !== password) {
        setError('Usuario o contraseña incorrectos.');
        setLoading(false);
        return;
      }

      // Ensure Firebase Auth account exists (migration for existing users)
      const authEmail = found.email?.trim() || `${found.usuario.toLowerCase()}@vivens.local`;
      await fsAuthCreateUser(authEmail, found.password);

      // Sign in with Firebase Auth
      await fsAuthLogin(usuario.trim(), password);

      setSession(found);
      onLogin(found);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? 'desconocido';
      const msg = (err as { message?: string })?.message ?? '';
      if (code === 'auth/too-many-requests') {
        setError('Demasiados intentos fallidos. Intenta más tarde.');
      } else {
        setError(`Error [${code}]: ${msg}`);
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 50%, #0891b2 100%)' }}>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-8 py-7 text-center" style={{ background: 'linear-gradient(135deg, #0f766e, #0d9488)' }}>
          <div className="flex items-center justify-center mb-4">
            <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="28" cy="28" r="28" fill="white" fillOpacity="0.15"/>
              <circle cx="22" cy="24" r="10" fill="#f97316" fillOpacity="0.9"/>
              <circle cx="34" cy="24" r="10" fill="white" fillOpacity="0.7"/>
              <circle cx="28" cy="33" r="10" fill="#fb923c" fillOpacity="0.6"/>
            </svg>
          </div>
          <h1 className="text-white font-bold text-xl leading-tight tracking-wide">VIVENS</h1>
          <p className="text-teal-100 text-xs mt-1 font-medium">Clínica Renal El Puyo</p>
          <p className="text-teal-200 text-xs mt-0.5">Control de Temperatura y Humedad</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Usuario</label>
            <input
              type="text"
              value={usuario}
              onChange={e => { setUsuario(e.target.value); setError(''); }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              placeholder="Ingresa tu usuario"
              autoFocus
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              placeholder="••••••••"
              disabled={loading}
            />
          </div>
          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full text-white font-semibold py-2.5 rounded-lg text-sm transition-colors shadow disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #0f766e, #0d9488)' }}
          >
            {loading ? 'Verificando...' : 'Ingresar'}
          </button>
          <p className="text-center text-xs text-gray-400">
            Usuario por defecto: <span className="font-mono font-semibold">admin</span> / <span className="font-mono font-semibold">admin123</span>
          </p>
        </form>
      </div>
      <p className="mt-6 text-teal-100 text-xs opacity-70">© Clínica Renal El Puyo – VIVENS</p>
    </div>
  );
}
