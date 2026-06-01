import { useState, useEffect, useCallback, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Termohigrometro, Anexo10Data, Anexo11Data, MESES, Usuario } from './types';
import {
  emptyEntries10, emptyEntries11,
  getSession, setSession,
} from './utils/storage';
import {
  fsLoadTermos, fsSaveTermo, fsDeleteTermo,
  fsLoadUsuarios, fsSaveUsuario, fsDeleteUsuario,
  fsLoadRegistro, fsSaveRegistro,
  fsLoadLockedDays, fsSaveLockedDays,
  fsGetMonthsWithData,
} from './utils/firestore';
import HeaderForm from './components/HeaderForm';
import { Anexo10Table, Anexo11Table } from './components/RegistroTable';
import { Anexo10Chart, Anexo11Chart } from './components/TempChart';
import Sidebar from './components/Sidebar';
import TermoCard from './components/TermoCard';
import TermoModal from './components/TermoModal';
import LoginScreen from './components/LoginScreen';
import UserModal from './components/UserModal';
import ReportesTab from './components/ReportesTab';

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ─── Screen 1: Dashboard ──────────────────────────────────────────────────────

interface DashboardProps {
  termos: Termohigrometro[];
  currentUser: Usuario;
  onView: (t: Termohigrometro) => void;
  onAdd: () => void;
  onEdit: (t: Termohigrometro) => void;
  onDelete: (id: string) => void;
  onLogout: () => void;
}

function Dashboard({ termos, currentUser, onView, onAdd, onEdit, onDelete, onLogout }: DashboardProps) {
  const [tab, setTab] = useState<'equipos' | 'reportes' | 'usuarios'>('equipos');
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<Usuario | null>(null);
  const isAdmin = currentUser.rol === 'admin';

  useEffect(() => {
    fsLoadUsuarios().then(setUsuarios).catch(() => {
      alert('Error al cargar usuarios.');
    });
  }, []);

  const handleSaveUser = async (u: Usuario) => {
    try {
      await fsSaveUsuario(u);
      const updated = editUser ? usuarios.map(x => x.id === u.id ? u : x) : [...usuarios, u];
      setUsuarios(updated);
      setUserModalOpen(false);
      setEditUser(null);
    } catch {
      alert('Error al guardar usuario.');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (id === currentUser.id) { alert('No puedes eliminar tu propio usuario.'); return; }
    if (!confirm('¿Eliminar este usuario?')) return;
    try {
      await fsDeleteUsuario(id);
      setUsuarios(usuarios.filter(u => u.id !== id));
    } catch {
      alert('Error al eliminar usuario.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100">
      {/* Nav */}
      <nav className="bg-blue-900 text-white px-6 py-3 flex items-center gap-3 shadow-lg">
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">R</div>
        <div className="flex-1">
          <div className="font-bold text-base leading-tight">RPIS — Control de Temperatura y Humedad</div>
          <div className="text-xs text-blue-200">Almacén Farmacéutico — Ecuador</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold text-white">{currentUser.nombre}</div>
            <div className="text-xs text-blue-300">{currentUser.rol === 'admin' ? '👑 Administrador' : '👤 Operador'}</div>
          </div>
          <button
            onClick={onLogout}
            className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </nav>

      {/* Tabs — always visible, Usuarios only for admin */}
      <div className="bg-white border-b border-gray-200 px-6">
          <div className="flex gap-1 max-w-6xl mx-auto">
            {(['equipos', 'reportes', ...(isAdmin ? ['usuarios'] : [])] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t as typeof tab)}
                className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                  tab === t ? 'border-blue-700 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t === 'equipos' ? '🌡️ Equipos' : t === 'reportes' ? '📊 Reportes' : '👥 Usuarios'}
              </button>
            ))}
          </div>
        </div>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* ─── Reportes tab ─── */}
        {tab === 'reportes' && (
          <ReportesTab termos={termos} />
        )}

        {/* ─── Equipos tab ─── */}
        {tab === 'equipos' && (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-blue-900">Equipos registrados</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  {termos.length === 0 ? 'Sin equipos aún' : `${termos.length} equipo${termos.length !== 1 ? 's' : ''}`}
                </p>
              </div>
              {isAdmin && (
                <button
                  onClick={onAdd}
                  className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors shadow-sm"
                >
                  ➕ Agregar equipo
                </button>
              )}
            </div>
            {termos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4 text-3xl">🌡️</div>
                <h2 className="text-lg font-bold text-blue-900 mb-1">No hay equipos registrados</h2>
                <p className="text-sm text-gray-500 mb-6 max-w-xs">Agrega tu primer termohigrómetro para comenzar.</p>
                {isAdmin && (
                  <button onClick={onAdd} className="bg-blue-700 hover:bg-blue-800 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors shadow">
                    Agregar primer equipo
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {termos.map(t => (
                  <TermoCard key={t.id} termo={t} onView={onView} onEdit={isAdmin ? onEdit : undefined} onDelete={isAdmin ? onDelete : undefined} />
                ))}
              </div>
            )}
          </>
        )}

        {/* ─── Usuarios tab (admin only) ─── */}
        {tab === 'usuarios' && isAdmin && (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-blue-900">Usuarios del sistema</h1>
                <p className="text-sm text-gray-500 mt-0.5">{usuarios.length} usuario{usuarios.length !== 1 ? 's' : ''}</p>
              </div>
              <button
                onClick={() => { setEditUser(null); setUserModalOpen(true); }}
                className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors shadow-sm"
              >
                ➕ Nuevo usuario
              </button>
            </div>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-blue-50 text-blue-900 text-xs font-semibold uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">Nombre</th>
                    <th className="px-4 py-3 text-left">Usuario</th>
                    <th className="px-4 py-3 text-left">Rol</th>
                    <th className="px-4 py-3 text-left">Creado</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {usuarios.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{u.nombre}</td>
                      <td className="px-4 py-3 font-mono text-gray-600">{u.usuario}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${u.rol === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                          {u.rol === 'admin' ? '👑 Admin' : '👤 Operador'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{new Date(u.creadoEn).toLocaleDateString('es-EC')}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => { setEditUser(u); setUserModalOpen(true); }} className="text-blue-600 hover:text-blue-800 text-xs font-semibold mr-3">Editar</button>
                        <button onClick={() => handleDeleteUser(u.id)} className="text-red-500 hover:text-red-700 text-xs font-semibold">Eliminar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>

      {userModalOpen && (
        <UserModal initial={editUser} onSave={handleSaveUser} onCancel={() => { setUserModalOpen(false); setEditUser(null); }} />
      )}
    </div>
  );
}

// ─── Screen 2: Registro mensual ───────────────────────────────────────────────

interface RegistroScreenProps {
  termo: Termohigrometro;
  currentUser: Usuario;
  onBack: () => void;
}

function RegistroScreen({ termo, currentUser, onBack }: RegistroScreenProps) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthNum = now.getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthNum);
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);
  const [loading, setLoading] = useState(true);
  const [monthsWithData, setMonthsWithData] = useState<{ year: number; month: number }[]>([]);

  const isAmbiental = termo.tipo === 'ambiental';

  // ─── Anexo 10 state ───
  const [anexo10, setAnexo10] = useState<Anexo10Data>({
    header: { institucion: '', estrategia: '', establecimiento: '', direccion: '', noEquipo: termo.numero, anio: String(currentYear), mes: String(currentMonthNum).padStart(2, '0') },
    footer: { revisadoPor: '', cargo: '', fecha: '' },
    entries: emptyEntries10(currentYear, currentMonthNum),
  });
  const [lockedDays10, setLockedDays10] = useState<Set<number>>(new Set());
  const [loadedKey10, setLoadedKey10] = useState(`${currentYear}-${String(currentMonthNum).padStart(2, '0')}`);

  // ─── Anexo 11 state ───
  const [anexo11, setAnexo11] = useState<Anexo11Data>({
    header: { institucion: '', estrategia: '', establecimiento: '', direccion: '', noEquipo: termo.numero, anio: String(currentYear), mes: String(currentMonthNum).padStart(2, '0') },
    footer: { revisadoPor: '', cargo: '', fecha: '' },
    entries: emptyEntries11(currentYear, currentMonthNum),
  });
  const [lockedDays11, setLockedDays11] = useState<Set<number>>(new Set());
  const [loadedKey11, setLoadedKey11] = useState(`${currentYear}-${String(currentMonthNum).padStart(2, '0')}`);

  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `RPIS_${termo.nombre}_${MESES[selectedMonth - 1]}_${selectedYear}`,
  });

  // Initial load
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [registro, locked, mwd] = await Promise.all([
          fsLoadRegistro(termo.id, currentYear, currentMonthNum),
          fsLoadLockedDays(termo.id, currentYear, currentMonthNum),
          fsGetMonthsWithData(termo.id),
        ]);
        if (cancelled) return;
        const mesStr = String(currentMonthNum).padStart(2, '0');
        if (isAmbiental) {
          const base = registro as Anexo10Data | null;
          const entries = (base?.entries && base.entries.length > 0) ? base.entries : emptyEntries10(currentYear, currentMonthNum);
          const header = { ...(base?.header ?? { institucion: '', estrategia: '', establecimiento: '', direccion: '', noEquipo: '', anio: String(currentYear), mes: mesStr }), noEquipo: base?.header?.noEquipo || termo.numero };
          const footer = base?.footer ?? { revisadoPor: currentUser.nombre, cargo: '', fecha: '' };
          if (!footer.revisadoPor) footer.revisadoPor = currentUser.nombre;
          setAnexo10({ ...(base ?? { header, footer }), header, footer, entries });
          setLockedDays10(locked);
        } else {
          const base = registro as Anexo11Data | null;
          const entries = (base?.entries && base.entries.length > 0) ? base.entries : emptyEntries11(currentYear, currentMonthNum);
          const header = { ...(base?.header ?? { institucion: '', estrategia: '', establecimiento: '', direccion: '', noEquipo: '', anio: String(currentYear), mes: mesStr }), noEquipo: base?.header?.noEquipo || termo.numero };
          const footer = base?.footer ?? { revisadoPor: currentUser.nombre, cargo: '', fecha: '' };
          if (!footer.revisadoPor) footer.revisadoPor = currentUser.nombre;
          setAnexo11({ ...(base ?? { header, footer }), header, footer, entries });
          setLockedDays11(locked);
        }
        setMonthsWithData(mwd);
      } catch {
        if (!cancelled) alert('Error al cargar datos. Verifica tu conexión.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save with debounce
  const debouncedAnexo10 = useDebounce(anexo10, 800);
  const debouncedAnexo11 = useDebounce(anexo11, 800);

  useEffect(() => {
    if (loading) return;
    const y = parseInt(debouncedAnexo10.header.anio);
    const m = parseInt(debouncedAnexo10.header.mes);
    if (!isNaN(y) && !isNaN(m)) {
      fsSaveRegistro(termo.id, y, m, debouncedAnexo10).catch(() => {
        alert('Error al guardar datos de Anexo 10.');
      });
    }
  }, [debouncedAnexo10, termo.id, loading]);

  useEffect(() => {
    if (loading) return;
    const y = parseInt(debouncedAnexo11.header.anio);
    const m = parseInt(debouncedAnexo11.header.mes);
    if (!isNaN(y) && !isNaN(m)) {
      fsSaveRegistro(termo.id, y, m, debouncedAnexo11).catch(() => {
        alert('Error al guardar datos de Anexo 11.');
      });
    }
  }, [debouncedAnexo11, termo.id, loading]);

  useEffect(() => {
    if (loading) return;
    const y = parseInt(anexo10.header.anio);
    const m = parseInt(anexo10.header.mes);
    if (!isNaN(y) && !isNaN(m)) {
      fsSaveLockedDays(termo.id, y, m, lockedDays10).catch(() => {
        alert('Error al guardar días bloqueados.');
      });
    }
  }, [lockedDays10, anexo10.header.anio, anexo10.header.mes, termo.id, loading]);

  useEffect(() => {
    if (loading) return;
    const y = parseInt(anexo11.header.anio);
    const m = parseInt(anexo11.header.mes);
    if (!isNaN(y) && !isNaN(m)) {
      fsSaveLockedDays(termo.id, y, m, lockedDays11).catch(() => {
        alert('Error al guardar días bloqueados.');
      });
    }
  }, [lockedDays11, anexo11.header.anio, anexo11.header.mes, termo.id, loading]);

  // Navigation handler — loads data for selected year/month
  const handleNavigate = useCallback(async (year: number, month: number) => {
    setSelectedYear(year);
    setSelectedMonth(month);
    const mesStr = String(month).padStart(2, '0');
    const newKey = `${year}-${mesStr}`;

    try {
      if (isAmbiental) {
        if (newKey !== loadedKey10) {
          const [registro, locked] = await Promise.all([
            fsLoadRegistro(termo.id, year, month),
            fsLoadLockedDays(termo.id, year, month),
          ]);
          const base = registro as Anexo10Data | null;
          const entries = (base?.entries && base.entries.length > 0) ? base.entries : emptyEntries10(year, month);
          const header = { ...(base?.header ?? { institucion: '', estrategia: '', establecimiento: '', direccion: '', noEquipo: '', anio: String(year), mes: mesStr }), anio: String(year), mes: mesStr, noEquipo: base?.header?.noEquipo || termo.numero };
          const footer10 = base?.footer ?? { revisadoPor: currentUser.nombre, cargo: '', fecha: '' };
          if (!footer10.revisadoPor) footer10.revisadoPor = currentUser.nombre;
          setAnexo10({ ...(base ?? { header, footer: footer10 }), header, footer: footer10, entries });
          setLockedDays10(locked);
          setLoadedKey10(newKey);
        }
      } else {
        if (newKey !== loadedKey11) {
          const [registro, locked] = await Promise.all([
            fsLoadRegistro(termo.id, year, month),
            fsLoadLockedDays(termo.id, year, month),
          ]);
          const base = registro as Anexo11Data | null;
          const entries = (base?.entries && base.entries.length > 0) ? base.entries : emptyEntries11(year, month);
          const header = { ...(base?.header ?? { institucion: '', estrategia: '', establecimiento: '', direccion: '', noEquipo: '', anio: String(year), mes: mesStr }), anio: String(year), mes: mesStr, noEquipo: base?.header?.noEquipo || termo.numero };
          const footer11 = base?.footer ?? { revisadoPor: currentUser.nombre, cargo: '', fecha: '' };
          if (!footer11.revisadoPor) footer11.revisadoPor = currentUser.nombre;
          setAnexo11({ ...(base ?? { header, footer: footer11 }), header, footer: footer11, entries });
          setLockedDays11(locked);
          setLoadedKey11(newKey);
        }
      }
    } catch {
      alert('Error al cargar datos del mes seleccionado.');
    }

    // Close sidebar on mobile after navigation
    if (window.innerWidth < 768) setSidebarOpen(false);
  }, [isAmbiental, loadedKey10, loadedKey11, termo.id, termo.numero]);

  const handleHeader10Change = useCallback(async (header: Anexo10Data['header']) => {
    const newKey = `${header.anio}-${header.mes}`;
    if (newKey !== loadedKey10) {
      const y = parseInt(header.anio);
      const m = parseInt(header.mes);
      try {
        const [registro, locked] = await Promise.all([
          fsLoadRegistro(termo.id, y, m),
          fsLoadLockedDays(termo.id, y, m),
        ]);
        const base = registro as Anexo10Data | null;
        const entries = (base?.entries && base.entries.length > 0) ? base.entries : emptyEntries10(y, m);
        setAnexo10({ ...(base ?? { header, footer: { revisadoPor: '', cargo: '', fecha: '' } }), header, entries });
        setLockedDays10(locked);
        setLoadedKey10(newKey);
        setSelectedYear(y);
        setSelectedMonth(m);
      } catch {
        alert('Error al cargar datos del mes.');
      }
    } else {
      setAnexo10(prev => ({ ...prev, header }));
    }
  }, [loadedKey10, termo.id]);

  const handleHeader11Change = useCallback(async (header: Anexo11Data['header']) => {
    const newKey = `${header.anio}-${header.mes}`;
    if (newKey !== loadedKey11) {
      const y = parseInt(header.anio);
      const m = parseInt(header.mes);
      try {
        const [registro, locked] = await Promise.all([
          fsLoadRegistro(termo.id, y, m),
          fsLoadLockedDays(termo.id, y, m),
        ]);
        const base = registro as Anexo11Data | null;
        const entries = (base?.entries && base.entries.length > 0) ? base.entries : emptyEntries11(y, m);
        setAnexo11({ ...(base ?? { header, footer: { revisadoPor: '', cargo: '', fecha: '' } }), header, entries });
        setLockedDays11(locked);
        setLoadedKey11(newKey);
        setSelectedYear(y);
        setSelectedMonth(m);
      } catch {
        alert('Error al cargar datos del mes.');
      }
    } else {
      setAnexo11(prev => ({ ...prev, header }));
    }
  }, [loadedKey11, termo.id]);

  const year10 = parseInt(anexo10.header.anio);
  const month10 = parseInt(anexo10.header.mes);
  const year11 = parseInt(anexo11.header.anio);
  const month11 = parseInt(anexo11.header.mes);

  const mesNombre = MESES[selectedMonth - 1];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex flex-col">
      {/* Top nav */}
      <nav className="bg-blue-900 text-white px-6 py-3 flex items-center gap-3 shadow-lg no-print z-50 relative">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shrink-0"
          title="Volver al menú principal"
        >
          ← Menú
        </button>
        <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-xs shrink-0">R</div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm leading-tight truncate">
            {termo.nombre}{termo.numero ? ` · N° ${termo.numero}` : ''}
          </div>
          <div className="text-xs text-blue-200 truncate">
            <span className={isAmbiental ? 'text-blue-300' : 'text-teal-300'}>
              {isAmbiental ? 'Anexo 10 — Ambiente' : 'Anexo 11 — Refrigeración'}
            </span>
            {' · '}{currentUser.nombre}
          </div>
        </div>
        {/* Print / PDF button */}
        <button
          onClick={() => handlePrint()}
          className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shrink-0 no-print"
          title="Imprimir / Exportar PDF"
        >
          🖨️ Imprimir
        </button>
      </nav>

      <div className="flex flex-1 relative no-print">
        {/* Sidebar */}
        <Sidebar
          termo={termo}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          onNavigate={handleNavigate}
          onBack={onBack}
          monthsWithData={monthsWithData}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(o => !o)}
        />

        {/* Main content — shifts right when sidebar is open on desktop */}
        <main
          className={`flex-1 px-4 md:px-6 py-6 transition-all duration-300 ${sidebarOpen ? 'md:ml-64' : 'ml-0'}`}
          style={{ paddingLeft: sidebarOpen ? undefined : '3.5rem' }}
        >
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <p className="text-blue-600">Cargando...</p>
            </div>
          ) : (
            <>
              {/* Month/year heading */}
              <div className="mb-4 flex items-center gap-3">
                <h2 className="text-lg font-bold text-blue-900">
                  {mesNombre} {selectedYear}
                </h2>
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                    isAmbiental ? 'bg-blue-100 text-blue-800' : 'bg-teal-100 text-teal-800'
                  }`}
                >
                  {isAmbiental ? 'Temperatura y Humedad Ambiental' : 'Temperatura de Refrigeración'}
                </span>
              </div>

              {isAmbiental ? (
                <div ref={printRef} className="bg-white rounded-xl shadow-md p-6">
                  <HeaderForm
                    data={anexo10.header}
                    onChange={handleHeader10Change}
                    equipoLabel="No. Termohigrómetro"
                    anexoTitle="ANEXO 10 — REGISTRO DE TEMPERATURA Y HUMEDAD AMBIENTAL"
                    anexoSubtitle="Almacén / Bodega Farmacéutica"
                  />
                  <Anexo10Table
                    entries={anexo10.entries}
                    onChange={entries => setAnexo10(prev => ({ ...prev, entries }))}
                    footer={anexo10.footer}
                    onFooterChange={footer => setAnexo10(prev => ({ ...prev, footer }))}
                    lockedDays={lockedDays10}
                    onLockedDaysChange={setLockedDays10}
                  />
                  <Anexo10Chart
                    entries={anexo10.entries}
                    year={year10}
                    month={month10}
                  />
                </div>
              ) : (
                <div ref={printRef} className="bg-white rounded-xl shadow-md p-6">
                  <HeaderForm
                    data={anexo11.header}
                    onChange={handleHeader11Change}
                    equipoLabel="No. Equipo de Refrigeración"
                    anexoTitle="ANEXO 11 — REGISTRO DE TEMPERATURA DE REFRIGERACIÓN"
                    anexoSubtitle="Almacén / Cadena de Frío Farmacéutica"
                  />
                  <Anexo11Table
                    entries={anexo11.entries}
                    onChange={entries => setAnexo11(prev => ({ ...prev, entries }))}
                    footer={anexo11.footer}
                    onFooterChange={footer => setAnexo11(prev => ({ ...prev, footer }))}
                    lockedDays={lockedDays11}
                    onLockedDaysChange={setLockedDays11}
                  />
                  <Anexo11Chart
                    entries={anexo11.entries}
                    year={year11}
                    month={month11}
                  />
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [currentUser, setCurrentUser] = useState<Usuario | null>(() => getSession());
  const [termos, setTermos] = useState<Termohigrometro[]>([]);

  useEffect(() => {
    fsLoadTermos().then(setTermos).catch(() => {
      alert('Error al cargar equipos. Verifica tu conexión.');
    });
  }, []);

  // Visible termos: admin sees all, operador sees only assigned ones
  const visibleTermos = currentUser
    ? currentUser.rol === 'admin'
      ? termos
      : termos.filter(t => currentUser.termosAsignados.includes(t.id))
    : [];
  const [selectedTermo, setSelectedTermo] = useState<Termohigrometro | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Termohigrometro | null>(null);

  const handleLogin = (user: Usuario) => setCurrentUser(user);

  const handleLogout = () => {
    setSession(null);
    setCurrentUser(null);
    setSelectedTermo(null);
  };

  const handleSaveTermo = async (t: Termohigrometro) => {
    try {
      await fsSaveTermo(t);
      const updated = editTarget ? termos.map(x => x.id === t.id ? t : x) : [...termos, t];
      setTermos(updated);
      setModalOpen(false);
      setEditTarget(null);
    } catch {
      alert('Error al guardar equipo.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este equipo y todos sus registros?')) return;
    try {
      await fsDeleteTermo(id);
      setTermos(termos.filter(t => t.id !== id));
    } catch {
      alert('Error al eliminar equipo.');
    }
  };

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (selectedTermo) {
    return (
      <RegistroScreen
        termo={selectedTermo}
        currentUser={currentUser}
        onBack={() => setSelectedTermo(null)}
      />
    );
  }

  return (
    <>
      <Dashboard
        termos={visibleTermos}
        currentUser={currentUser}
        onView={setSelectedTermo}
        onAdd={() => { setEditTarget(null); setModalOpen(true); }}
        onEdit={t => { setEditTarget(t); setModalOpen(true); }}
        onDelete={handleDelete}
        onLogout={handleLogout}
      />
      {modalOpen && (
        <TermoModal
          initial={editTarget}
          onSave={handleSaveTermo}
          onCancel={() => { setModalOpen(false); setEditTarget(null); }}
        />
      )}
    </>
  );
}
